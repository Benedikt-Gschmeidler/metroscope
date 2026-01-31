'use client'

import React from 'react'
import { topology } from '@/data/topology'
import MetroMap from './components/MetroMap'

function App() {
  return (
    <MetroMap topology={topology} />
  )
}

export default App
