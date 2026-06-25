// Custom role + assignment letting the API function app issue Static Web App
// user invitations at runtime (reproduces a manually-created role found in the
// as-built inventory). The role is assigned at the SWA scope to the API app's
// SYSTEM-ASSIGNED identity — that is the identity DefaultAzureCredential uses
// for the createUserInvitation call.

@description('Static Web App name to scope the assignment to.')
param staticWebAppName string

@description('System-assigned principal id of the API function app.')
param functionSystemPrincipalId string

resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' existing = {
  name: staticWebAppName
}

resource invitationRole 'Microsoft.Authorization/roleDefinitions@2022-04-01' = {
  name: guid(resourceGroup().id, 'HasteWebAppUserManager')
  properties: {
    roleName: 'HasteWebAppUserManager-${uniqueString(resourceGroup().id)}'
    description: 'Lets the HASTE API app manage Static Web App users (invitations).'
    type: 'CustomRole'
    permissions: [
      {
        actions: [
          'microsoft.web/staticSites/*'
        ]
        notActions: []
        dataActions: []
        notDataActions: []
      }
    ]
    assignableScopes: [
      resourceGroup().id
    ]
  }
}

resource invitationAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(staticWebApp.id, functionSystemPrincipalId, 'HasteWebAppUserManager')
  scope: staticWebApp
  properties: {
    roleDefinitionId: invitationRole.id
    principalId: functionSystemPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output roleDefinitionId string = invitationRole.id
