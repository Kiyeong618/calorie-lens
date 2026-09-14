import type { Variants } from 'motion/react'
export const MOTION={fast:.16,normal:.34,slow:.72}
export const pageVariants:Variants={hidden:{opacity:0,y:12,filter:'blur(6px)'},show:{opacity:1,y:0,filter:'blur(0px)',transition:{duration:.55,ease:'easeOut',staggerChildren:.1}}}
export const itemVariants:Variants={hidden:{opacity:0,y:10},show:{opacity:1,y:0,transition:{duration:.42,ease:'easeOut'}}}
