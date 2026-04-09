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
            agent {
                docker {
                    image 'node:20-alpine'
                }
            }
            steps {
                dir('02_Source/01_Source Code/backend') {
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
                    image 'node:20-alpine'
                }
            }
            steps {
                dir('02_Source/01_Source Code/backend') {
                    sh '''
                    npm install
                    npx jest --testPathPatterns=src --testPathIgnorePatterns=src/unit-test --forceExit
                    '''
                }
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
            agent {
                docker {
                    image 'node:20-alpine'
                }
            }
            steps {
                dir('02_Source/01_Source Code/backend') {
                    sh '''
                    npm install
                    npx jest --config ./test/jest-e2e.json --forceExit
                    '''
                }
            }
        }

    }
}
