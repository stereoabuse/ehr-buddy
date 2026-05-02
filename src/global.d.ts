declare module '*.sql?raw' {
  const content: string
  export default content
}

declare module 'pdfkit' {
  const PDFDocument: any
  export default PDFDocument
}

declare module 'archiver' {
  const archiver: any
  export default archiver
}
