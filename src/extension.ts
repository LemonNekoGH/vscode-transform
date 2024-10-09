import * as vscode from 'vscode'
import { ModelOperations as LanguageDetector } from '@vscode/vscode-languagedetection'
import converters from './converters'

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('VSCode Transform')

  const languageDetector = new LanguageDetector()

  const commandDisposables = converters.map((converter) => {
    return vscode.commands.registerCommand(converter.command, async () => {
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

      let convertResult = ''
      try {
        convertResult = await converter.convert(text)
      }
      catch (e) {
        const error = e as Error
        vscode.window.showErrorMessage(error.message)
        outputChannel.appendLine(error.message)
        return
      }

      editor.edit((editBuilder) => {
        editBuilder.replace(editor.selection, convertResult)
      })
      editor.selection = new vscode.Selection(0, 0, 0, 0)
    })
  })

  const pasteAndConvertCommand = vscode.commands.registerCommand('vscode-transform.paste-and-convert', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found')
      return
    }

    const clipboardText = await vscode.env.clipboard.readText()
    const cursorPosition = editor.selection.active
    await editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, clipboardText)
    })
    const clipboardSplit = clipboardText.split('\n')
    editor.selection = new vscode.Selection(cursorPosition, cursorPosition.translate(clipboardSplit.length, clipboardSplit.at(-1)!.length))

    const possibleLanguages = await languageDetector.runModel(clipboardText)
    const language = possibleLanguages.sort((a, b) => b.confidence - a.confidence)[0]
    outputChannel.appendLine(`Pasted text language: ${language.languageId}, editor language: ${editor.document.languageId}`)

    const converter = converters.find(converter => converter.from === language.languageId && converter.to === editor.document.languageId)
    if (!converter) {
      outputChannel.appendLine('No converter found')
      vscode.window.showErrorMessage(`No converter found from ${language.languageId} to ${editor.document.languageId}`)
      return
    }

    const quickPickResult = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: `Convert pasted text from ${language.languageId} to ${editor.document.languageId}?`,
    })

    if (quickPickResult !== 'Yes') {
      return
    }

    vscode.commands.executeCommand(converter.command)
  })

  outputChannel.appendLine('Congratulations, your extension "vscode-transform" is now active!')
  context.subscriptions.push(...commandDisposables, pasteAndConvertCommand)
}

export function deactivate() {}
