import jsonToGo from 'json-to-go' // this module is commonjs, so esbuild cannot build it correctly
import gofmt from '@lemonneko/gofmt.js'

export default [
  {
    from: 'json',
    to: 'go',
    convert: async (text: string): Promise<string> => {
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
    },
    command: 'vscode-transform.json-to-go',
  },
]
