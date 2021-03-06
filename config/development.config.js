
/////////////////////////////////////////////////////////////////////
// DEVELOPMENT configuration
//
/////////////////////////////////////////////////////////////////////
const HOST_URL = 'http://localhost'
const PORT= 3000

const config = {

  env: 'development',

  client: {
    host: `${HOST_URL}`,
    env: 'development',
    port: PORT
  },

  meta: {
    bucketKey: 'forge-rcdb-meta-dev'
  },

  forge: {

    oauth: {

      redirectUri: `${HOST_URL}:${PORT}/api/forge/callback/oauth`,
      authenticationUri: '/authentication/v1/authenticate',
      refreshTokenUri: '/authentication/v1/refreshtoken',
      authorizationUri: '/authentication/v1/authorize',
      accessTokenUri: '/authentication/v1/gettoken',

      baseUri: 'https://developer.api.autodesk.com',
      clientSecret: process.env.FORGE_CLIENT_SECRET,
      clientId: process.env.FORGE_CLIENT_ID,

      //baseUri: 'https://developer-stg.api.autodesk.com',
      //clientSecret: process.env.FORGE_STG_CLIENT_SECRET,
      //clientId: process.env.FORGE_STG_CLIENT_ID,

      scope: [
        'data:read',
        'data:create',
        'data:write',
        'bucket:read',
        'bucket:create'
      ]
    },

    viewer: {
      //viewer3D: 'https://developer.api.autodesk.com/viewingservice/v1/viewers/viewer3D.js?v=2.14',
      //threeJS:  'https://developer.api.autodesk.com/viewingservice/v1/viewers/three.js?v=2.14',
      //style:    'https://developer.api.autodesk.com/viewingservice/v1/viewers/style.css?v=2.14'

      // requires local copy of viewer lib - not provided in this sample
      viewer3D: '/resources/libs/viewer-2.14/viewer3D.js',
      threeJS:  '/resources/libs/viewer-2.14/three.js',
      style:    '/resources/libs/viewer-2.14/style.css'
    }
  },
  databases: [
    {
      type: 'mongo',
      dbName: 'forge-rcdb',
      user: '',
      pass: '',
      dbhost: 'localhost',
      port: 27017,
      collections: {
        configurator: {
          models: 'configurator.models'
        },
        gallery: {
          models: 'gallery.models'
        },
        rcdb:{
          materials: 'rcdb.materials',
          models: 'rcdb.models'
        }
      }
    }
  ]
}

module.exports = config


