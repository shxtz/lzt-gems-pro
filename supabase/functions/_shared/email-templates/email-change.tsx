/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Img, Section, Hr } from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://augzjiubwfmybwncbbgv.supabase.co/storage/v1/object/public/category-icons/email-logo.png'

interface EmailChangeEmailProps { siteName: string; email: string; newEmail: string; confirmationUrl: string }

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme a alteração de e-mail — {siteName}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="VBUCKS BARATO" width="140" height="auto" style={logo} />
        </Section>
        <Section style={heroBar} />
        <Section style={content}>
          <Heading style={h1}>Alteração de e-mail ✉️</Heading>
          <Text style={text}>
            Você solicitou a troca do e-mail da sua conta na <strong style={goldText}>VBUCKS BARATO</strong>:
          </Text>
          <Section style={infoBox}>
            <Text style={infoLabel}>De:</Text>
            <Text style={infoValue}>{email}</Text>
            <Text style={infoLabel}>Para:</Text>
            <Text style={infoValue}>{newEmail}</Text>
          </Section>
          <Section style={buttonWrapper}>
            <Button style={button} href={confirmationUrl}>✓ CONFIRMAR ALTERAÇÃO</Button>
          </Section>
          <Hr style={divider} />
          <Text style={small}>Se você não solicitou esta alteração, proteja sua conta imediatamente.</Text>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} VBUCKS BARATO — Todos os direitos reservados</Text>
          <Text style={footerSub}>Feito por Ajazz & Bypass</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#f5f0e8', fontFamily: "'Urbanist', 'Segoe UI', Arial, sans-serif" }
const wrapper = { maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const, boxShadow: '0 8px 40px rgba(78, 40, 2, 0.08)' }
const header = { backgroundColor: '#1a1108', padding: '28px 0', textAlign: 'center' as const }
const logo = { margin: '0 auto' }
const heroBar = { height: '4px', background: 'linear-gradient(90deg, #D4A843, #ecb32c, #D4A843)' }
const content = { padding: '36px 32px 28px' }
const h1 = { fontSize: '22px', fontWeight: '800' as const, color: '#1a1108', margin: '0 0 16px', lineHeight: '1.3' }
const goldText = { color: '#D4A843' }
const text = { fontSize: '14px', color: '#5c5147', lineHeight: '1.7', margin: '0 0 16px' }
const infoBox = { backgroundColor: '#faf7f2', border: '1px solid #ede8df', borderRadius: '10px', padding: '16px 20px', margin: '0 0 16px' }
const infoLabel = { fontSize: '11px', color: '#a09888', margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
const infoValue = { fontSize: '14px', color: '#1a1108', fontWeight: '600' as const, margin: '2px 0 10px' }
const buttonWrapper = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#D4A843', color: '#1a1108', fontSize: '13px', fontWeight: '800' as const, borderRadius: '10px', padding: '14px 36px', textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase' as const }
const divider = { borderColor: '#ede8df', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#a09888', lineHeight: '1.5', margin: '0' }
const footer = { backgroundColor: '#1a1108', padding: '20px 32px', textAlign: 'center' as const }
const footerText = { fontSize: '11px', color: '#8a7a60', margin: '0 0 4px' }
const footerSub = { fontSize: '10px', color: '#5c4a30', margin: '0' }
