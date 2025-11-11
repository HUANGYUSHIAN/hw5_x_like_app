import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    // 读取更新说明文件
    const filePath = join(process.cwd(), 'database', 'preprocess', 'update-notes.txt')
    const content = await readFile(filePath, 'utf-8')
    
    return NextResponse.json({ 
      content: content.trim(),
      success: true 
    })
  } catch (error: any) {
    // 如果文件不存在，返回空内容
    if (error.code === 'ENOENT') {
      return NextResponse.json({ 
        content: '',
        success: true 
      })
    }
    
    console.error('Error reading update notes:', error)
    return NextResponse.json({ 
      content: '',
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}



