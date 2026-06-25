// The three HASTE Flex Consumption function apps (API, TiTiler, Queues),
// each built from functionApp.bicep with its own always-ready instance count
// (matching create_function_app's 10 / 5 / 1).

@description('Azure region.')
param location string

@description('API function app name.')
param functionApiName string

@description('TiTiler function app name.')
param functionTitilerName string

@description('Queue-triggers function app name.')
param functionQueueName string

@description('Functions storage account name.')
param storageAccountName string

@description('Premium file storage account name.')
param fileStorageAccountName string

@description('User-assigned managed identity resource id.')
param umiResourceId string

@description('VNet name.')
param vnetName string

@description('Functions subnet name.')
param functionsSubnetName string

@description('Log Analytics workspace resource id.')
param logAnalyticsId string

@description('Resource tags.')
param tags object = {}

module apiApp 'functionApp.bicep' = {
  name: 'fn-api'
  params: {
    location: location
    name: functionApiName
    planName: '${functionApiName}-plan'
    alwaysReadyCount: 10
    storageAccountName: storageAccountName
    fileStorageAccountName: fileStorageAccountName
    umiResourceId: umiResourceId
    vnetName: vnetName
    functionsSubnetName: functionsSubnetName
    logAnalyticsId: logAnalyticsId
    tags: tags
  }
}

module titilerApp 'functionApp.bicep' = {
  name: 'fn-titiler'
  params: {
    location: location
    name: functionTitilerName
    planName: '${functionTitilerName}-plan'
    alwaysReadyCount: 5
    storageAccountName: storageAccountName
    fileStorageAccountName: fileStorageAccountName
    umiResourceId: umiResourceId
    vnetName: vnetName
    functionsSubnetName: functionsSubnetName
    logAnalyticsId: logAnalyticsId
    tags: tags
  }
}

module queueApp 'functionApp.bicep' = {
  name: 'fn-queue'
  params: {
    location: location
    name: functionQueueName
    planName: '${functionQueueName}-plan'
    alwaysReadyCount: 1
    storageAccountName: storageAccountName
    fileStorageAccountName: fileStorageAccountName
    umiResourceId: umiResourceId
    vnetName: vnetName
    functionsSubnetName: functionsSubnetName
    logAnalyticsId: logAnalyticsId
    tags: tags
  }
}

// Used by roles.bicep to grant the SWA invitation role to the API app's
// system-assigned identity.
output apiSystemPrincipalId string = apiApp.outputs.systemPrincipalId
output apiName string = apiApp.outputs.name
output titilerName string = titilerApp.outputs.name
output queueName string = queueApp.outputs.name
