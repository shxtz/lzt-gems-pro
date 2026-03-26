/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu link de login — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>⬡ VBUCKS BARATO</Text>
        <Hr style={divider} />
        <Heading style={h1}>Seu link de login</Heading>
        <Text style={text}>Clique no botão abaixo para entrar na {siteName}. Este link expira em breve.</Text>
        <Button style={button} href={confirmationUrl}>Entrar</Button>
        <Text style={footer}>Se você não solicitou este link, ignore este e-mail.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Urbanist', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const brand = { fontSize: '11px', fontWeight: 'bold' as const, color: '#D4A843', letterSpacing: '0.2em', margin: '0 0 16px', textAlign: 'center' as const }
const divider = { borderColor: '#eaeaea', margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1108', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#6b6560', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: '#D4A843', color: '#1a1108', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
