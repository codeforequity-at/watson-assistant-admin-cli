const util = require('util')
const path = require('path')
const fs = require('fs')
const async = require('async')
const slug = require('slug')
const mkdirp = require('mkdirp')
const AssistantV1 = require('watson-developer-cloud/assistant/v1')
const debug = require('debug')('watson-assistant-admin-cli-backup')

const handler = (argv) => {
  const opt = {
    version: argv['assistant-apiversion']
  }
  if (argv['assistant-username']) {
    opt.username = argv['assistant-username']
  }
  if (argv['assistant-password']) {
    opt.password = argv['assistant-password']
  }
  if (argv['assistant-url']) {
    opt.url = argv['assistant-url']
  }
  debug(`connection options: ${util.inspect(opt)}`)

  const assistant = new AssistantV1(opt)

  let workspaceIds = []

  async.series([
    (dirAvailable) => {
      mkdirp(argv.output, dirAvailable)
    },

    (workspacesReceived) => {
      if (argv.workspace === 'all') {
        assistant.listWorkspaces((err, result) => {
          if (err) {
            return workspacesReceived(err)
          }

          if (result.workspaces) {
            workspaceIds = result.workspaces.map((ws) => ws.workspace_id)
          }
          workspacesReceived()
        })
      } else {
        workspaceIds = [ argv.workspace ]
        workspacesReceived()
      }
    },

    (backupDone) => {
      async.series(workspaceIds.map((workspaceId) => (workspaceBackupDone) => {
        assistant.getWorkspace({ workspace_id: workspaceId, export: true }, (err, workspace) => {
          if (err) {
            return workspaceBackupDone(err)
          }

          const filename = path.resolve(argv.output, slug(workspace.name) + '.json')
          fs.writeFile(filename, JSON.stringify(workspace, null, 2), (err) => {
            if (err) {
              return workspaceBackupDone(`Backing up worksacpe ${workspace.name} to ${filename} failed: ${util.inspect(err)}`)
            }

            console.log(`Backed up worksacpe ${workspace.name} to ${filename}.`)
            workspaceBackupDone()
          })
        })
      }),
      backupDone)
    }

  ], (err) => {
    if (err) {
      console.log(`Backing up workspace(s) failed: ${util.inspect(err)}`)
    }
  })
}

module.exports = {
  command: 'backup [workspace]',
  describe: 'Backup Watson Assistant workspace(s).',
  builder: (yargs) => {
    yargs.positional('workspace', {
      describe: 'Workspace ID to backup (or "all" to backup all)',
      default: 'all'
    })
    yargs.option('output', {
      describe: 'Directory name to output workspace backup file(s)',
      default: 'out'
    })
    yargs.option('assistant-username', {
      describe: 'Watson assistant username (also read from env variable "ASSISTANT_USERNAME")'
    })
    yargs.option('assistant-password', {
      describe: 'Watson assistant password (also read from env variable "ASSISTANT_PASSWORD")'
    })
    yargs.option('assistant-url', {
      describe: 'Watson assistant url (also read from env variable "ASSISTANT_URL")'
    })
    yargs.option('assistant-apiversion', {
      describe: 'Watson assistant api version (also read from env variable "ASSISTANT_APIVERSION")',
      default: '2018-02-16'
    })
  },
  handler
}
