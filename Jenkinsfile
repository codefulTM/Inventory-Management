pipeline {
    agent any

    stages {

        stage('Prepare ENV') {
            steps {
                sh '''
                cp "/home/ubuntu/codes/Inventory-Management/03_Deployment/01_Deployment_Package/.env" \
                "03_Deployment/01_Deployment_Package/.env"
                '''
            }
        }

        stage('Unit Test') {
            agent {
                docker {
                    image 'node:20-alpine'
                }
            }
            steps {
                dir('02_Source/01_Source Code/inventory-management-service') {
                    sh '''
                    npm install
                    npx jest --testPathPatterns=src/unit-test --forceExit
                    '''
                }
            }
        }

        stage('Integration Test') {
            agent {
                docker {
                    image 'node:20'
                }
            }
            steps {
                dir('02_Source/01_Source Code/inventory-management-service') {
                    sh '''
                    npm install
                    npx jest --testPathPatterns=src --testPathIgnorePatterns=src/unit-test --forceExit
                    '''
                }
            }
        }

        stage('Stop Old Containers') {
            steps {
                dir('03_Deployment/01_Deployment_Package') {
                    sh '''
                    docker compose --env-file .env down || true
                    '''
                }
            }
        }

        stage('Build') {
            steps {
                dir('03_Deployment/01_Deployment_Package') {
                    sh '''
                    docker compose --env-file .env build
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                dir('03_Deployment/01_Deployment_Package') {
                    sh '''
                    docker compose --env-file .env up -d
                    '''
                }
            }
        }

        stage('E2E Test') {
            agent {
                docker {
                    image 'node:20-alpine'
                }
            }
            steps {
                dir('02_Source/01_Source Code/inventory-management-service') {
                    sh '''
                    npm install
                    npx jest --config ./test/jest-e2e.json --forceExit
                    '''
                }
            }
        }

    }

    post {
        failure {
            dir('03_Deployment/01_Deployment_Package') {
                sh '''
                echo "=== Pipeline failed! Rolling back... ==="
                docker compose --env-file .env down || true
                docker compose --env-file .env up -d || true
                echo "=== Rollback completed ==="
                '''
            }
        }
    }
}
