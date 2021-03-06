///////////////////////////////////////////////////////////
// MetaProperties Viewer Extension
// By Philippe Leefsma, Autodesk Inc, April 2017
//
///////////////////////////////////////////////////////////
import MultiModelExtensionBase from 'Viewer.MultiModelExtensionBase'
import MetaAPI from './Viewing.Extension.MetaProperties.API'
import ExtensionBase from 'Viewer.ExtensionBase'
import {AddMetaProperty} from './MetaProperty'
import WidgetContainer from 'WidgetContainer'
import MetaTreeView from './MetaTreeView'
import ServiceManager from 'SvcManager'
import Toolkit from 'Viewer.Toolkit'
import { ReactLoader } from 'Loader'
import DOMPurify from 'dompurify'
import ReactDOM from 'react-dom'
import Label from 'Label'
import React from 'react'

class MetaPropertiesExtension extends MultiModelExtensionBase {

  /////////////////////////////////////////////////////////
	// Class constructor
  //
  /////////////////////////////////////////////////////////
	constructor (viewer, options) {

		super (viewer, options)

    this.onPropertyDeleted = this.onPropertyDeleted.bind(this)
    this.onPropertyUpdated = this.onPropertyUpdated.bind(this)
    this.onPropertyAdded = this.onPropertyAdded.bind(this)
    this.onDeleteProperty = this.onDeleteProperty.bind(this)
    this.onEditProperty = this.onEditProperty.bind(this)
    this.onMetaChanged = this.onMetaChanged.bind(this)
    this.onContextMenu = this.onContextMenu.bind(this)
    this.renderTitle = this.renderTitle.bind(this)


    this.dialogSvc =
      ServiceManager.getService('DialogSvc')

    this.socketSvc =
      ServiceManager.getService('SocketSvc')

    this.socketSvc.on (
      'meta.propertyDeleted',
      this.onPropertyDeleted)

    this.socketSvc.on (
      'meta.propertyUpdated',
      this.onPropertyUpdated)

    this.socketSvc.on (
      'meta.propertyAdded',
      this.onPropertyAdded)

    this.react = options.react
	}

	/////////////////////////////////////////////////////////
	// Load callback
  //
  /////////////////////////////////////////////////////////
	load () {

    this.react.setState({

      properties: [],
      model: null,
      dbId: null

    }).then (() => {

      this.react.pushRenderExtension(this)

      const model = this.viewer.activeModel

      if (model) {

        this.setModel(model)
      }
    })

    this.viewer.loadDynamicExtension(
      'Viewing.Extension.ContextMenu').then(
        (ctxMenuExtension) => {

          ctxMenuExtension.addHandler(
            this.onContextMenu)
        })

    console.log('Viewing.Extension.MetaProperties loaded')

		return true
	}

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get className() {

    return 'meta-properties'
  }

  /////////////////////////////////////////////////////////
	// Extension Id
  //
  /////////////////////////////////////////////////////////
	static get ExtensionId () {

		return 'Viewing.Extension.MetaProperties'
	}

  /////////////////////////////////////////////////////////
	// Unload callback
  //
  /////////////////////////////////////////////////////////
	unload () {

    console.log('Viewing.Extension.MetaProperties loaded')

    this.socketSvc.off (
      'meta.propertyDeleted',
      this.onPropertyDeleted)

    this.socketSvc.off (
      'meta.propertyUpdated',
      this.onPropertyUpdated)

    this.socketSvc.off (
      'meta.propertyAdded',
      this.onPropertyAdded)

    super.unload ()

		return true
	}

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onObjectTreeCreated (event) {

    this.setModel(event.model)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onModelActivated (event) {

    if (event.source !== 'model.loaded') {

      this.setModel(event.model)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onPropertyAdded (metaPayload) {

    this.loadNodeProperties (metaPayload.dbId, true)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onPropertyUpdated (metaPayload) {

    this.loadNodeProperties (metaPayload.dbId, true)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onPropertyDeleted (dbId) {

    this.loadNodeProperties (dbId, true)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async setModel (model) {

    await this.react.setState({
      model
    })

    const modelId = model.dbModelId ||
      this.options.dbModel._id

    const database = model.database ||
      this.options.database

    const {apiUrl} = this.options

    this.api = new MetaAPI(
      `${apiUrl}/meta/${database}/${modelId}`)

    const instanceTree = model.getData().instanceTree

    this.loadNodeProperties(instanceTree.getRootId())
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onSelection (event) {

    if (event.selections.length) {

      const selection = event.selections[0]

      const dbId = selection.dbIdArray[0]

      this.loadNodeProperties(dbId)

    } else {

      const {model} = this.react.getState()

      if (model) {

        const instanceTree = model.getData().instanceTree

        const dbId = instanceTree.getRootId()

        this.loadNodeProperties(dbId)
      }
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async loadNodeProperties (dbId, refresh) {

    const state = this.react.getState()

    if (!refresh && dbId === state.dbId) {
      return
    }

    if (!refresh) {

      await this.react.setState({
        properties: []
      })
    }

    const {model} = this.react.getState()

    const modelProperties =
      await Toolkit.getProperties(
        model, dbId)

    const metaProperties =
      await this.api.getNodeMetaProperties(dbId)

    const properties = [
      ...modelProperties,
      ...metaProperties
    ]

    await this.react.setState({
      guid: this.guid(),
      properties,
      dbId
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onContextMenu (event) {

    const {model} = this.react.getState()

    if (!model) {
      return
    }

    const instanceTree = model.getData().instanceTree

    const dbId = event.dbId || (instanceTree
      ? instanceTree.getRootId()
      : -1)

    if (dbId > -1) {

      event.menu.push({
        title: 'Add Meta Property',
        target: () => {
          this.showAddMetaPropertyDlg(dbId)
        }
      })
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getFileExt (filename) {

    return filename.split('.').pop(-1)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  buildMetaPayload (metaProperty) {

    switch (metaProperty.metaType) {

      case 'File':

        if (metaProperty.file) {

          const file = metaProperty.file

          const fileExt = this.getFileExt(file.name)

          const fileId =
            `${this.guid('xxxx-xxxx-xxxx')}.${fileExt}`

          const payload = Object.assign({},
            metaProperty, {
              filelink: this.api.apiUrl + `/download/${fileId}`,
              fileId
            })

          const notification = this.options.notify.add({
            title: 'Uploading ' + file.name,
            message: 'progress: 0%',
            dismissible: false,
            status: 'loading',
            dismissAfter: 0,
            position: 'tl'
          })

          this.api.uploadResource(fileId, file, {
            progress: (percent) => {

              notification.message =
                `progress: ${percent.toFixed(2)}%`

              if (percent === 100) {

                notification.title = `${file.name} uploaded!`
                notification.message = `progress: 100%`
                notification.dismissAfter = 5000
                notification.dismissible = true
                notification.status = 'success'
                notification.buttons = [{
                  name: 'OK',
                  primary: true
                }]
              }

              this.options.notify.update(notification)
            }
          })

          window.URL.revokeObjectURL(file.preview)

          delete payload.file

          return payload

        } else {

          // file not changed
          return metaProperty
        }

      default:
        return metaProperty
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  showAddMetaPropertyDlg (dbId) {

    const onClose = async(result) => {

      this.dialogSvc.off('dialog.close', onClose)

      if (result === 'OK') {

        const metaProperty = Object.assign({},
          this.metaPropertyEdits, {
            dbId: dbId.toString(),
            id: this.guid()
          })

        const metaPayload = this.buildMetaPayload(
          metaProperty)

        await this.api.addNodeMetaProperty(
          metaPayload)

        this.loadNodeProperties(dbId, true)

        this.socketSvc.broadcast (
          'meta.propertyAdded',
          metaPayload)
      }
    }

    this.dialogSvc.on('dialog.close', onClose)

    this.dialogSvc.setState({
      className: 'meta-property-dlg',
      title: 'Add Meta Property ...',
      disableOK: true,
      open: true,
      content:
        <AddMetaProperty
          disableOK={this.dialogSvc.disableOK}
          onChanged={this.onMetaChanged}
        />
    }, true)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMetaChanged (metaPropertyEdits) {

    this.metaPropertyEdits = metaPropertyEdits
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onEditProperty (metaProperty) {

    return new Promise ((resolve) => {

      const onClose = (result) => {

        this.dialogSvc.off('dialog.close', onClose)

        if (result === 'OK') {

          const newMetaProperty = Object.assign({},
            this.metaPropertyEdits, {
              dbId: metaProperty.dbId,
              id: metaProperty.id
            })

          const newMetaPayload = this.buildMetaPayload(
            newMetaProperty)

          if (newMetaProperty.file && metaProperty.fileId) {

            this.api.deleteResource(metaProperty.fileId)
          }

          this.api.updateNodeMetaProperty(
            newMetaPayload)

          this.socketSvc.broadcast (
            'meta.propertyUpdated',
            newMetaPayload)

          resolve (newMetaPayload)
        }

        resolve (false)
      }

      this.dialogSvc.on('dialog.close', onClose)

      const dlgProps = Object.assign({}, metaProperty, {
        disableOK: this.dialogSvc.disableOK,
        onChanged: this.onMetaChanged,
        editMode: true
      })

      this.dialogSvc.setState({
        content: <AddMetaProperty {...dlgProps}/>,
        className: 'meta-property-dlg',
        title: 'Edit Meta Property ...',
        disableOK: true,
        open: true
      }, true)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onDeleteProperty (metaProperty) {

    return new Promise ((resolve) => {

      const onClose = (result) => {

        this.dialogSvc.off('dialog.close', onClose)

        if (result === 'OK') {

          this.api.deleteNodeMetaProperty(
            metaProperty.id)

          this.socketSvc.broadcast (
            'meta.propertyDeleted',
            metaProperty.dbId)

          resolve (true)
        }

        resolve (false)
      }

      this.dialogSvc.on('dialog.close', onClose)

      const msg = DOMPurify.sanitize(
        `Are you sure you want to delete`
        + ` <b>${metaProperty.displayName}</b> ?`)

      this.dialogSvc.setState({
        title: 'Delete Property ...',
        content:
          <div dangerouslySetInnerHTML={{__html: msg}}>
          </div>,
        open: true
      })
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async setDocking (docked) {

    const id = MetaPropertiesExtension.ExtensionId

    if (docked) {

      await this.react.popRenderExtension(id)

      this.react.pushViewerPanel(this, {
        height: 250,
        width: 350
      })

    } else {

      await this.react.popViewerPanel(id)

      this.react.pushRenderExtension(this)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderTitle (docked) {

    const spanClass = docked
      ? 'fa fa-chain-broken'
      : 'fa fa-chain'

    return (
      <div className="title">
        <label>
          Meta Properties
        </label>
        <div className="meta-properties-controls">
          <button onClick={() => this.setDocking(docked)}
            title="Toggle docking mode">
            <span className={spanClass}/>
          </button>
        </div>
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderControls () {

    return (
      <div className="controls">

      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderTreeView (properties) {

    const {guid, model, dbId} = this.react.getState()

    const instanceTree = model.getData().instanceTree

    const rootName = instanceTree.getNodeName(dbId)

    return (
      <MetaTreeView
        menuContainer={this.options.appContainer}
        onDeleteProperty={this.onDeleteProperty}
        onEditProperty={this.onEditProperty}
        properties={properties}
        displayName={rootName}
        model={model}
        dbId={dbId}
        guid={guid}
      />
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderContent () {

    const {properties} = this.react.getState()

    const content = properties.length
      ? this.renderTreeView(properties)
      : <div/>

    return (
      <div className="content">
        <ReactLoader show={!properties.length}/>
        { content }
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  render (opts) {

    return (
      <WidgetContainer
        renderTitle={() => this.renderTitle(opts.docked)}
        showTitle={opts.showTitle}
        className={this.className}>

        { this.renderControls() }
        { this.renderContent () }

      </WidgetContainer>
    )
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension (
  MetaPropertiesExtension.ExtensionId,
  MetaPropertiesExtension)

export default 'Viewing.Extension.MetaProperties'
