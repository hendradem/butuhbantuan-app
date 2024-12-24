import { useEffect, useState } from 'react'
import { BottomSheet } from 'react-spring-bottom-sheet'
import 'react-spring-bottom-sheet/dist/style.css'

export default function Bottomseettest() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <BottomSheet open={open}>My awesome content here</BottomSheet>
    </>
  )
}