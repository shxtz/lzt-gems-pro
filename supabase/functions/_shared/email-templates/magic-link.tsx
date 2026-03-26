/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Img, Section, Hr } from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://augzjiubwfmybwncbbgv.supabase.co/storage/v1/object/public/category-icons/email-logo.png'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu link de acesso — {siteName}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="VBUCKS BARATO" width="140" height="auto" style={logo} />
        </Section>
        <Section style={heroBar} />
        <Section style={content}>
          <Heading style={h1}>Link de acesso rápido ⚡</Heading>
          <Text style={text}>
            Clique no botão abaixo para acessar sua conta na <strong style={goldText}>VBUCKS BARATO</strong>. Este link expira em breve.
          </Text>
          <Section style={buttonWrapper}>
            <Button style={button} href={confirmationUrl}>🚀 ACESSAR MINHA CONTA</Button>
          </Section>
          <Hr style={divider} />
          <Text style={small}>Se você não solicitou este link, ignore este e-mail com segurança.</Text>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} VBUCKS BARATO — Todos os direitos reservados</Text>
          <Text style={footerSub}>Feito por Ajazz & Bypass</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#f5f0e8', fontFamily: "'Urbanist', 'Segoe UI', Arial, sans-serif" }
const wrapper = { maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const, boxShadow: '0 8px 40px rgba(78, 40, 2, 0.08)' }
const header = { backgroundColor: '#1a1108', padding: '28px 0', textAlign: 'center' as const }
const logo = { margin: '0 auto' }
const heroBar = { height: '4px', background: 'linear-gradient(90deg, #D4A843, #ecb32c, #D4A843)' }
const content = { padding: '36px 32px 28px' }
const h1 = { fontSize: '22px', fontWeight: '800' as const, color: '#1a1108', margin: '0 0 16px', lineHeight: '1.3' }
const goldText = { color: '#D4A843' }
const text = { fontSize: '14px', color: '#5c5147', lineHeight: '1.7', margin: '0 0 16px' }
const buttonWrapper = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#D4A843', color: '#1a1108', fontSize: '13px', fontWeight: '800' as const, borderRadius: '10px', padding: '14px 36px', textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase' as const }
const divider = { borderColor: '#ede8df', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#a09888', lineHeight: '1.5', margin: '0' }
const footer = { backgroundColor: '#1a1108', padding: '20px 32px', textAlign: 'center' as const }
const footerText = { fontSize: '11px', color: '#8a7a60', margin: '0 0 4px' }
const footerSub = { fontSize: '10px', color: '#5c4a30', margin: '0' }
