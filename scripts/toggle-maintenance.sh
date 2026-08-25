#!/bin/bash
# Maintenance Mode Toggle Script for BC Home Energy Platform
# Usage: ./toggle-maintenance.sh [enable|disable|status]

set -euo pipefail

NAMESPACE="${NAMESPACE:-}"
MAIN_APP_SERVICE="${MAIN_APP_SERVICE:-hesp-app}"
MAIN_APP_PORT="${MAIN_APP_PORT:-3000}"
MAINTENANCE_SERVICE="${MAINTENANCE_SERVICE:-maintenance}"
MAINTENANCE_PORT="${MAINTENANCE_PORT:-8080}"
NGINX_ROUTE_NAME="${NGINX_ROUTE_NAME:-hesp-nginx}"
NGINX_DEPLOYMENT_NAME="${NGINX_DEPLOYMENT_NAME:-hesp-nginx-proxy}"
NGINX_CONFIGMAP_NAME="${NGINX_CONFIGMAP_NAME:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo "ℹ $1"
}

resolve_namespace() {
    if [ -n "$NAMESPACE" ]; then
        return
    fi

    NAMESPACE=$(oc project -q 2>/dev/null || true)
    if [ -z "$NAMESPACE" ]; then
        print_error "NAMESPACE is not set and current project could not be detected."
        print_info "Set it explicitly, e.g. NAMESPACE=e3c3c4-prod $0 status"
        exit 1
    fi
}

check_prerequisites() {
    # Check if oc/kubectl is available
    if ! command -v oc &> /dev/null; then
        print_error "oc CLI not found. Please install OpenShift CLI."
        exit 1
    fi

    # Check if we're logged in
    if ! oc whoami &> /dev/null; then
        print_error "Not logged into OpenShift. Please run 'oc login' first."
        exit 1
    fi

    resolve_namespace

    # Check namespace
    if ! oc get namespace "$NAMESPACE" &> /dev/null; then
        print_error "Namespace '$NAMESPACE' not found or not accessible."
        exit 1
    fi

    print_success "Prerequisites check passed"
}

is_nginx_proxy_mode() {
    oc get route "$NGINX_ROUTE_NAME" -n "$NAMESPACE" &> /dev/null
}

get_nginx_configmap() {
    if [ -n "$NGINX_CONFIGMAP_NAME" ]; then
        echo "$NGINX_CONFIGMAP_NAME"
        return
    fi

    local cm
    cm=$(oc get configmap hesp-nginx-config -n "$NAMESPACE" -o name 2>/dev/null | cut -d'/' -f2 || true)
    if [ -z "$cm" ]; then
        cm=$(oc get configmap -n "$NAMESPACE" -o name | grep 'nginx-config' | head -n1 | cut -d'/' -f2 || true)
    fi

    if [ -z "$cm" ]; then
        print_error "Could not find nginx proxy ConfigMap in namespace '$NAMESPACE'."
        exit 1
    fi

    echo "$cm"
}

get_nginx_upstream_target() {
    local cm=$1
    oc get configmap "$cm" -n "$NAMESPACE" -o jsonpath='{.data.nginx\.conf}' | \
        awk '
            /upstream hesp_app[[:space:]]*\{/ { in_upstream=1; next }
            in_upstream && /^[[:space:]]*server[[:space:]]+/ {
                gsub(/^[[:space:]]*server[[:space:]]+/, "", $0)
                gsub(/;[[:space:]]*$/, "", $0)
                print $0
                exit
            }
            in_upstream && /\}/ { in_upstream=0 }
        '
}

switch_nginx_upstream() {
    local cm=$1
    local from_target=$2
    local to_target=$3

    # Patch only the hesp_app upstream server line.
    oc get configmap "$cm" -n "$NAMESPACE" -o yaml | \
        sed "s/server ${from_target};/server ${to_target};/g" | \
        oc apply -f - >/dev/null
}

restart_nginx_proxy() {
    print_info "Restarting nginx proxy deployment..."
    oc rollout restart deployment/"$NGINX_DEPLOYMENT_NAME" -n "$NAMESPACE" >/dev/null
    oc rollout status deployment/"$NGINX_DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout=180s >/dev/null
}

get_main_route() {
    local route
    route=$(oc get routes -n "$NAMESPACE" -o name | grep "$MAIN_APP_SERVICE" | head -n1 | cut -d'/' -f2)
    
    if [ -z "$route" ]; then
        print_error "Could not find main application route"
        exit 1
    fi
    
    echo "$route"
}

get_current_service() {
    local route=$1
    oc get route "$route" -n "$NAMESPACE" -o jsonpath='{.spec.to.name}' 2>/dev/null
}

check_maintenance_pod() {
    local pod_status
    pod_status=$(oc get pods -n "$NAMESPACE" -l app.kubernetes.io/name=maintenance -o jsonpath='{.items[0].status.phase}' 2>/dev/null)
    
    if [ "$pod_status" != "Running" ]; then
        print_error "Maintenance pod is not running (status: ${pod_status:-NOT_FOUND})"
        print_info "Deploy maintenance pod first: helm install maintenance helm/_maintenance"
        exit 1
    fi
    
    print_success "Maintenance pod is running"
}

enable_maintenance() {
    print_info "Enabling maintenance mode..."
    echo ""
    
    check_prerequisites
    check_maintenance_pod

    if is_nginx_proxy_mode; then
        local cm
        local current_upstream
        local app_target
        local maintenance_target

        cm=$(get_nginx_configmap)
        app_target="${MAIN_APP_SERVICE}:${MAIN_APP_PORT}"
        maintenance_target="${MAINTENANCE_SERVICE}:${MAINTENANCE_PORT}"
        current_upstream=$(get_nginx_upstream_target "$cm")

        print_info "Mode: nginx proxy (vanity domain path)"
        print_info "ConfigMap: $cm"
        print_info "Current upstream: ${current_upstream:-UNKNOWN}"

        if [ "$current_upstream" = "$maintenance_target" ]; then
            print_warning "Maintenance mode is already enabled"
            exit 0
        fi

        print_warning "This will redirect vanity-domain traffic to the maintenance page"
        read -p "Continue? (yes/no): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_info "Cancelled"
            exit 0
        fi

        print_info "Switching nginx upstream from '$app_target' to '$maintenance_target'..."
        switch_nginx_upstream "$cm" "$app_target" "$maintenance_target"
        restart_nginx_proxy

        current_upstream=$(get_nginx_upstream_target "$cm")
        if [ "$current_upstream" = "$maintenance_target" ]; then
            echo ""
            print_success "Maintenance mode ENABLED"
            print_info "Users will now see the maintenance page"
            print_info "To restore service, run: $0 disable"
        else
            print_error "Failed to enable maintenance mode via nginx upstream switch"
            exit 1
        fi
        return
    fi
    
    local main_route
    main_route=$(get_main_route)
    print_info "Main route: $main_route"
    
    local current_service
    current_service=$(get_current_service "$main_route")
    print_info "Current service: $current_service"
    
    if [ "$current_service" = "$MAINTENANCE_SERVICE" ]; then
        print_warning "Maintenance mode is already enabled"
        exit 0
    fi
    
    # Confirm action
    print_warning "This will redirect ALL traffic to the maintenance page"
    read -p "Continue? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Cancelled"
        exit 0
    fi
    
    # Patch the route
    print_info "Switching route to maintenance service..."
    oc patch route "$main_route" -n "$NAMESPACE" --type=merge \
        -p "{\"spec\":{\"to\":{\"name\":\"$MAINTENANCE_SERVICE\"}}}" >/dev/null
    
    # Verify
    sleep 2
    current_service=$(get_current_service "$main_route")
    
    if [ "$current_service" = "$MAINTENANCE_SERVICE" ]; then
        echo ""
        print_success "Maintenance mode ENABLED"
        print_info "Users will now see the maintenance page"
        print_info "To restore service, run: $0 disable"
    else
        print_error "Failed to enable maintenance mode"
        exit 1
    fi
}

disable_maintenance() {
    print_info "Disabling maintenance mode..."
    echo ""
    
    check_prerequisites

    if is_nginx_proxy_mode; then
        local cm
        local current_upstream
        local app_target
        local maintenance_target

        cm=$(get_nginx_configmap)
        app_target="${MAIN_APP_SERVICE}:${MAIN_APP_PORT}"
        maintenance_target="${MAINTENANCE_SERVICE}:${MAINTENANCE_PORT}"
        current_upstream=$(get_nginx_upstream_target "$cm")

        print_info "Mode: nginx proxy (vanity domain path)"
        print_info "ConfigMap: $cm"
        print_info "Current upstream: ${current_upstream:-UNKNOWN}"

        if [ "$current_upstream" = "$app_target" ]; then
            print_warning "Maintenance mode is already disabled"
            exit 0
        fi

        print_warning "This will restore normal application service"
        read -p "Continue? (yes/no): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_info "Cancelled"
            exit 0
        fi

        print_info "Switching nginx upstream from '$maintenance_target' to '$app_target'..."
        switch_nginx_upstream "$cm" "$maintenance_target" "$app_target"
        restart_nginx_proxy

        current_upstream=$(get_nginx_upstream_target "$cm")
        if [ "$current_upstream" = "$app_target" ]; then
            echo ""
            print_success "Maintenance mode DISABLED"
            print_info "Normal service restored"
        else
            print_error "Failed to disable maintenance mode via nginx upstream switch"
            exit 1
        fi
        return
    fi
    
    local main_route
    main_route=$(get_main_route)
    print_info "Main route: $main_route"
    
    local current_service
    current_service=$(get_current_service "$main_route")
    print_info "Current service: $current_service"
    
    if [ "$current_service" = "$MAIN_APP_SERVICE" ]; then
        print_warning "Maintenance mode is already disabled"
        exit 0
    fi
    
    # Confirm action
    print_warning "This will restore normal application service"
    read -p "Continue? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Cancelled"
        exit 0
    fi
    
    # Check if at least one main app pod is fully ready (READY x/x and Running).
    local app_ready_count
    app_ready_count=$(oc get pods -n "$NAMESPACE" -l app.kubernetes.io/name="$MAIN_APP_SERVICE" --no-headers 2>/dev/null | \
        awk '
            {
                split($2, rr, "/");
                if ($3 == "Running" && rr[1] == rr[2]) {
                    c++;
                }
            }
            END { print c+0 }
        ')

    if [ "${app_ready_count:-0}" -eq 0 ]; then
        print_warning "Main application pods may not be ready"
        read -p "Continue anyway? (yes/no): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_info "Cancelled"
            exit 0
        fi
    fi
    
    # Patch the route
    print_info "Switching route to main application service..."
    oc patch route "$main_route" -n "$NAMESPACE" --type=merge \
        -p "{\"spec\":{\"to\":{\"name\":\"$MAIN_APP_SERVICE\"}}}" >/dev/null
    
    # Verify
    sleep 2
    current_service=$(get_current_service "$main_route")
    
    if [ "$current_service" = "$MAIN_APP_SERVICE" ]; then
        echo ""
        print_success "Maintenance mode DISABLED"
        print_info "Normal service restored"
    else
        print_error "Failed to disable maintenance mode"
        exit 1
    fi
}

show_status() {
    check_prerequisites
    
    echo "========================================="
    echo "  Maintenance Mode Status"
    echo "========================================="
    echo ""
    
    echo "Namespace:       $NAMESPACE"
    
    if is_nginx_proxy_mode; then
        local cm
        local current_upstream
        local app_target
        local maintenance_target

        cm=$(get_nginx_configmap)
        app_target="${MAIN_APP_SERVICE}:${MAIN_APP_PORT}"
        maintenance_target="${MAINTENANCE_SERVICE}:${MAINTENANCE_PORT}"
        current_upstream=$(get_nginx_upstream_target "$cm")

        echo "Mode:            nginx proxy"
        echo "ConfigMap:       $cm"
        echo "Upstream target: ${current_upstream:-UNKNOWN}"
        echo ""

        if [ "$current_upstream" = "$maintenance_target" ]; then
            print_error "Status: MAINTENANCE MODE ENABLED"
            echo ""
            print_info "Users are seeing the maintenance page"
            print_info "To restore service: $0 disable"
        elif [ "$current_upstream" = "$app_target" ]; then
            print_success "Status: NORMAL OPERATION"
            echo ""
            print_info "Application is serving traffic normally"
        else
            print_warning "Status: UNKNOWN (upstream=$current_upstream)"
        fi
    else
        local main_route
        local current_service

        main_route=$(get_main_route)
        current_service=$(get_current_service "$main_route")

        echo "Mode:            direct app route"
        echo "Route:           $main_route"
        echo "Current Service: $current_service"
        echo ""

        if [ "$current_service" = "$MAINTENANCE_SERVICE" ]; then
            print_error "Status: MAINTENANCE MODE ENABLED"
            echo ""
            print_info "Users are seeing the maintenance page"
            print_info "To restore service: $0 disable"
        elif [ "$current_service" = "$MAIN_APP_SERVICE" ]; then
            print_success "Status: NORMAL OPERATION"
            echo ""
            print_info "Application is serving traffic normally"
        else
            print_warning "Status: UNKNOWN ($current_service)"
        fi
    fi
    
    echo ""
    echo "-------------------------------------"
    echo "Maintenance Pod Status:"
    oc get pods -n "$NAMESPACE" -l app.kubernetes.io/name=maintenance 2>/dev/null || print_warning "Maintenance pod not found"
    
    echo ""
    echo "-------------------------------------"
    echo "Main Application Pods:"
    oc get pods -n "$NAMESPACE" -l app.kubernetes.io/name="$MAIN_APP_SERVICE" 2>/dev/null || print_warning "Main app pods not found"
}

show_usage() {
    cat << EOF
Usage: $0 [command]

Commands:
    enable    Enable maintenance mode (show maintenance page to users)
    disable   Disable maintenance mode (restore normal service)
    status    Show current status

Environment Variables:
    NAMESPACE           OpenShift namespace (default: current oc project)
    MAIN_APP_SERVICE    Main application service name (default: hesp-app)
    MAIN_APP_PORT       Main app service port (default: 3000)
    MAINTENANCE_SERVICE Maintenance service name (default: maintenance)
    MAINTENANCE_PORT    Maintenance service port (default: 8080)
    NGINX_ROUTE_NAME    Nginx route name (default: hesp-nginx)
    NGINX_DEPLOYMENT_NAME Nginx deployment name (default: hesp-nginx-proxy)
    NGINX_CONFIGMAP_NAME Nginx configmap name (default: auto-detect)

Examples:
    $0 enable                          # Enable maintenance mode
    $0 disable                         # Disable maintenance mode
    $0 status                          # Check current status
    NAMESPACE=e3c3c4-test $0 status    # Check status in test environment

For more information, see docs/maintenance-page-pod.md
EOF
}

# Main script
case "${1:-}" in
    enable)
        enable_maintenance
        ;;
    disable)
        disable_maintenance
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Invalid command: ${1:-}"
        echo ""
        show_usage
        exit 1
        ;;
esac
