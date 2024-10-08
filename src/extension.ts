import * as vscode from 'vscode'
import jsonToGo from 'json-to-go' // this module is commonjs, so esbuild cannot build it correctly
import gofmt from '@lemonneko/gofmt.js'
import { ModelOperations as LanguageDetector } from '@vscode/vscode-languagedetection'

async function convertJSONToGo(text: string): Promise<string> {
  let json = ''
  try {
    json = JSON.parse(text)
  }
  catch (error) {
    const errorMessage = (error as Error).message
    throw new Error(`Invalid JSON: ${errorMessage}`)
  }

  const goStruct = jsonToGo(JSON.stringify(json), 'GeneratedStruct')
  if (goStruct.error) {
    throw new Error(`Error converting JSON to Go struct: ${goStruct.error}`)
  }

  const [formatResult, formatError] = await gofmt.format(goStruct.go)
  if (formatError) {
    throw new Error(`Error formatting Go struct: ${formatError}`)
  }

  return formatResult
}

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('vscode-transform')

  const languageDetector = new LanguageDetector()

  const jsonToGoCommand = vscode.commands.registerCommand('vscode-transform.json-to-go', async () => {
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

    let formatResult = ''
    try {
      formatResult = await convertJSONToGo(text)
    }
    catch (e) {
      const error = e as Error
      vscode.window.showErrorMessage(error.message)
      outputChannel.appendLine(error.message)
      return
    }

    editor.edit((editBuilder) => {
      editBuilder.replace(editor.selection, formatResult)
    })
    editor.selection = new vscode.Selection(0, 0, 0, 0)
  })

  const textChangeEventListener = vscode.workspace.onDidChangeTextDocument(async (textChangeEvent) => {
    if (textChangeEvent.contentChanges.length !== 1) {
      outputChannel.appendLine('Multiple content changes detected, skipping')
      return
    }

    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found')
      return
    }

    const change = textChangeEvent.contentChanges[0]
    const clipboardText = await vscode.env.clipboard.readText()
    // if the clipboard content is not the same as the text changed in the editor, skip
    // TODO: if redo/undo is used, this should not work
    if (change.text !== clipboardText) {
      return
    }

    outputChannel.appendLine(`Paste event detected, range start ${change.range.start.line}:${change.range.start.character}, end ${change.range.end.line}:${change.range.end.character}`)
    outputChannel.appendLine(`Offset ${change.rangeOffset}, length ${change.rangeLength}, text ${change.text}`)
    const changeTextLines = change.text.split('\n')

    const possibleLanguages = await languageDetector.runModel(clipboardText)
    const language = possibleLanguages.sort((a, b) => b.confidence - a.confidence)[0]
    outputChannel.appendLine(`Detected language: ${language.languageId}`)

    if (language.languageId !== 'json') {
      return
    }

    outputChannel.appendLine(`current document languageId: ${editor.document.languageId}`)
    if (editor.document.languageId !== 'go') {
      return
    }

    editor.selection = new vscode.Selection(change.range.start, new vscode.Position(change.range.start.line + changeTextLines.length, changeTextLines.at(-1)!.length))

    const quickPickResult = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'JSON detected, do you want to convert it?',
    })

    if (quickPickResult !== 'Yes') {
      return
    }

    vscode.commands.executeCommand('vscode-transform.json-to-go')
  })

  outputChannel.appendLine('Congratulations, your extension "vscode-transform" is now active!')
  context.subscriptions.push(jsonToGoCommand, textChangeEventListener)
}

export function deactivate() {}
