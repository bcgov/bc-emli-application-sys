.PHONY: build push deploy test clean help

# Variables - override these as needed
REGISTRY ?= your-registry
IMAGE_NAME ?= maintenance-page
TAG ?= latest
NAMESPACE ?= default
HELM_RELEASE ?= maintenance

# Full image name
IMAGE := $(REGISTRY)/$(IMAGE_NAME):$(TAG)

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the Docker image
	@echo "Building image: $(IMAGE)"
	docker build -t $(IMAGE) .
	@echo "✓ Image built successfully"

push: build ## Build and push the Docker image
	@echo "Pushing image: $(IMAGE)"
	docker push $(IMAGE)
	@echo "✓ Image pushed successfully"

test: build ## Build and test the image locally
	@echo "Starting container on port 8080..."
	@docker run --rm -d --name maintenance-test -p 8080:8080 $(IMAGE)
	@echo "Waiting for container to be ready..."
	@sleep 2
	@echo "Testing health endpoint..."
	@curl -f http://localhost:8080/health || (docker stop maintenance-test && exit 1)
	@echo "Testing main page..."
	@curl -f http://localhost:8080/ > /dev/null || (docker stop maintenance-test && exit 1)
	@docker stop maintenance-test
	@echo "✓ All tests passed!"
	@echo ""
	@echo "To test manually, run: make run"

run: build ## Run the container locally for manual testing
	@echo "Starting container on http://localhost:8080"
	@echo "Press Ctrl+C to stop"
	docker run --rm -it --name maintenance-test -p 8080:8080 $(IMAGE)

deploy: push ## Build, push, and deploy with Helm
	@echo "Deploying to namespace: $(NAMESPACE)"
	helm upgrade --install $(HELM_RELEASE) ../helm/_maintenance \
		--set image.repository=$(REGISTRY)/$(IMAGE_NAME) \
		--set image.tag=$(TAG) \
		--namespace $(NAMESPACE)
	@echo "✓ Deployed successfully"
	@echo ""
	@echo "To verify: kubectl get pods -n $(NAMESPACE) -l app.kubernetes.io/name=maintenance"

status: ## Check deployment status
	@echo "Checking pods..."
	kubectl get pods -n $(NAMESPACE) -l app.kubernetes.io/name=maintenance
	@echo ""
	@echo "Checking service..."
	kubectl get svc -n $(NAMESPACE) -l app.kubernetes.io/name=maintenance

logs: ## Show pod logs
	kubectl logs -n $(NAMESPACE) -l app.kubernetes.io/name=maintenance --tail=50 -f

clean: ## Remove local test containers
	-docker stop maintenance-test 2>/dev/null
	-docker rmi $(IMAGE) 2>/dev/null
	@echo "✓ Cleaned up"

uninstall: ## Uninstall Helm release
	helm uninstall $(HELM_RELEASE) -n $(NAMESPACE)
	@echo "✓ Uninstalled"

# Example usage with custom values:
# make build REGISTRY=myregistry.io IMAGE_NAME=my-maintenance TAG=v1.0.0
# make deploy NAMESPACE=production REGISTRY=myregistry.io TAG=v1.0.0
