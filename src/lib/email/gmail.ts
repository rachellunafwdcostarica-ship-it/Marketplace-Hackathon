import 'server-only'
import nodemailer from 'nodemailer'
import { serverEnv } from '@/lib/env.server'

export function createGmailTransport() {
  if (!serverEnv.GMAIL_USER || !serverEnv.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER y GMAIL_APP_PASSWORD son requeridas')
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: serverEnv.GMAIL_USER,
      pass: serverEnv.GMAIL_APP_PASSWORD,
    },
  })
}

export function getGmailFrom(): string {
  return `FWD Talent <${serverEnv.GMAIL_USER}>`
}
