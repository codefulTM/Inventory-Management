import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: 'http://localhost:8081',
  realm: 'inventory-management',
  clientId: 'react-frontend',
})

export default keycloak
