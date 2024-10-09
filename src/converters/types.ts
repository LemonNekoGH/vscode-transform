export interface Converter {
  from: string
  to: string
  convert: (text: string) => Promise<string>
  command: string
}
