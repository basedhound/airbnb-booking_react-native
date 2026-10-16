import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '0z83ssmn',
    dataset: 'production'
  },
  studioHost: 'roam-record',
  deployment: {
    appId: 'soosm2moze2t0olpvkbziq3p',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
