import * as vscode from 'vscode'
import jsonToGo from 'json-to-go' // this module is commonjs, so esbuild cannot build it correctly
import gofmt from '@lemonneko/gofmt.js'

export async function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('vscode-transform.json-to-go', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found')
      return
    }

    const document = editor.document
    const text = document.getText(editor.selection)

    if (!text) {
      vscode.window.showErrorMessage('No text selected')
      return
    }

    let json
    try {
      json = JSON.parse(text)
    }
    catch (error) {
      const errorMessage = (error as Error).message
      vscode.window.showErrorMessage(`Invalid JSON: ${errorMessage}`)
      console.error(errorMessage)
      return
    }

    const goStruct = jsonToGo(JSON.stringify(json), 'GeneratedStruct')
    if (goStruct.error) {
      vscode.window.showErrorMessage(`Error converting JSON to Go struct: ${goStruct.error}`)
      console.error(goStruct.error)
      return
    }

    const [formatResult, formatError] = await gofmt.format(goStruct.go)
    if (formatError) {
      vscode.window.showErrorMessage(`Error formatting Go struct: ${formatError}`)
      console.error(formatError)
      return
    }

    vscode.env.clipboard.writeText(formatResult)
    vscode.window.showInformationMessage('Converting result copied to clipboard')
  })

  console.log('Congratulations, your extension "vscode-transform" is now active!')
  context.subscriptions.push(disposable)
}

export function deactivate() {}
