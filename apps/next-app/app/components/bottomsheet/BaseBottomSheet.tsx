import React from 'react'
import { BottomSheet, BottomSheetProps } from 'react-spring-bottom-sheet'

// Explicit wrapper to satisfy JSX typings
export const BaseBottomSheet = React.forwardRef(
    (props: any, ref: React.Ref<any>) => <BottomSheet ref={ref} {...props} />
)
