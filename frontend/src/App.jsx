import { useState } from 'react'
import './App.css'
import Sidebar from './components/SideBar'
import Flow from './ReactFlow/Flow'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
        <Flow />
      </main>
    </div>
  )
}

export default App
