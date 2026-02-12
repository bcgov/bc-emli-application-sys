#!/bin/bash
# Maintenance Mode Toggle Script for BC Home Energy Platform
# Usage: ./toggle-maintenance.sh [enable|disable|status]

set -e

NAMESPACE="${NAMESPACE:-bfc7dd-prod}"
MAIN_APP_SERVICE="${MAIN_APP_SERVICE:-hesp-app}"
MAINTENANCE_SERVICE="maintenance"

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

    # Check namespace
    if ! oc get namespace "$NAMESPACE" &> /dev/null; then
        print_error "Namespace '$NAMESPACE' not found or not accessible."
        exit 1
    fi

    print_success "Prerequisites check passed"
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
    
    # Check if main app is ready
    local app_ready
    app_ready=$(oc get pods -n "$NAMESPACE" -l app.kubernetes.io/name="$MAIN_APP_SERVICE" \
        -o jsonpath='{.items[?(@.status.conditions[?(@.type=="Ready")].status=="True")].metadata.name}' 2>/dev/null)
    
    if [ -z "$app_ready" ]; then
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
    
    local main_route
    main_route=$(get_main_route)
    
    local current_service
    current_service=$(get_current_service "$main_route")
    
    echo "Namespace:       $NAMESPACE"
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
    NAMESPACE           OpenShift namespace (default: bfc7dd-prod)
    MAIN_APP_SERVICE    Main application service name (default: hesp-app)

Examples:
    $0 enable                          # Enable maintenance mode
    $0 disable                         # Disable maintenance mode
    $0 status                          # Check current status
    NAMESPACE=bfc7dd-test $0 status    # Check status in test environment

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
