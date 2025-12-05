import React from 'react'
import PdfApp from './components/PdfApp'

export default function App(){
  // place a PDF at public/sample.pdf or change the path
  return (
    <div className="app">
      <PdfApp pdfUrl="/sample.pdf" />
    </div>
  )
}
