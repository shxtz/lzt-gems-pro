/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Img, Section, Hr } from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://augzjiubwfmybwncbbgv.supabase.co/storage/v1/object/public/category-icons/email-logo.png'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação — VBUCKS BARATO</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="VBUCKS BARATO" width="140" height="auto" style={logo} />
        </Section>
        <Section style={heroBar} />
        <Section style={content}>
          <Heading style={h1}>Código de verificação 🔐</Heading>
          <Text style={text}>Use o código abaixo para confirmar sua identidade:</Text>
          <Section style={codeBox}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
          <Hr style={divider} />
          <Text style={small}>Este código expira em breve. Se você não solicitou, ignore este e-mail.</Text>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} VBUCKS BARATO — Todos os direitos reservados</Text>
          <Text style={footerSub}>Feito por Ajazz & Bypass</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#f5f0e8', fontFamily: "'Urbanist', 'Segoe UI', Arial, sans-serif" }
const wrapper = { maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const, boxShadow: '0 8px 40px rgba(78, 40, 2, 0.08)' }
const header = { backgroundColor: '#1a1108', padding: '28px 0', textAlign: 'center' as const }
const logo = { margin: '0 auto' }
const heroBar = { height: '4px', background: 'linear-gradient(90deg, #D4A843, #ecb32c, #D4A843)' }
const content = { padding: '36px 32px 28px' }
const h1 = { fontSize: '22px', fontWeight: '800' as const, color: '#1a1108', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#5c5147', lineHeight: '1.7', margin: '0 0 16px' }
const codeBox = { backgroundColor: '#1a1108', borderRadius: '12px', padding: '20px', textAlign: 'center' as const, margin: '8px 0 16px' }
const codeStyle = { fontFamily: "'Courier New', Courier, monospace", fontSize: '32px', fontWeight: '800' as const, color: '#D4A843', letterSpacing: '0.25em', margin: '0' }
const divider = { borderColor: '#ede8df', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#a09888', lineHeight: '1.5', margin: '0' }
const footer = { backgroundColor: '#1a1108', padding: '20px 32px', textAlign: 'center' as const }
const footerText = { fontSize: '11px', color: '#8a7a60', margin: '0 0 4px' }
const footerSub = { fontSize: '10px', color: '#5c4a30', margin: '0' }
