pipeline {
    agent any

    stages {

        stage('Prepare ENV') {
            steps {
                sh '''
                cp "/home/ubuntu/codes/Inventory-Management/02_Source/01_Source Code/backend/.env" \
                "02_Source/01_Source Code/backend/.env"
                '''
            }
        }

        stage('Unit Test') {
            steps {
                sh '''
                BACKEND="$(pwd)/02_Source/01_Source Code/backend"
                ln -sfn "${BACKEND}" /tmp/inv_backend
                docker run --rm \
                    -v /tmp/inv_backend:/app \
                    -w /app \
                    node:20-alpine \
                    sh -c 'npm install && npx jest --testPathPattern=src/unit-test --forceExit'
                '''
            }
        }

        stage('Integration Test') {
            steps {
                sh '''
                BACKEND="$(pwd)/02_Source/01_Source Code/backend"
                ln -sfn "${BACKEND}" /tmp/inv_backend
                docker run --rm \
                    -v /tmp/inv_backend:/app \
                    -w /app \
                    node:20-alpine \
                    sh -c 'npm install && npx jest --testPathPattern=src --testPathIgnorePatterns=src/unit-test --forceExit'
                '''
            }
        }

        stage('Stop Old Containers') {
            steps {
                sh '''
                docker compose -f "02_Source/01_Source Code/docker-compose.yml" down || true
                '''
            }
        }

        stage('Build Docker') {
            steps {
                sh '''
                docker compose -f "02_Source/01_Source Code/docker-compose.yml" build
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                docker compose -f "02_Source/01_Source Code/docker-compose.yml" up -d
                '''
            }
        }

        stage('E2E Test') {
            steps {
                sh '''
                BACKEND="$(pwd)/02_Source/01_Source Code/backend"
                ln -sfn "${BACKEND}" /tmp/inv_backend
                docker run --rm \
                    -v /tmp/inv_backend:/app \
                    -w /app \
                    node:20-alpine \
                    sh -c 'npm install && npx jest --config ./test/jest-e2e.json --forceExit'
                '''
            }
        }

    }
}
