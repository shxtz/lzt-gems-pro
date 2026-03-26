/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Img, Section, Hr, Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://augzjiubwfmybwncbbgv.supabase.co/storage/v1/object/public/category-icons/email-logo.png'

interface DeliveryConfirmationProps {
  productName?: string
  credential?: string
  orderId?: string
  totalPrice?: string
}

const DeliveryConfirmationEmail = ({ productName, credential, orderId, totalPrice }: DeliveryConfirmationProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Sua compra foi entregue — VBUCKS BARATO</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="VBUCKS BARATO" width="140" height="auto" style={logo} />
        </Section>
        <Section style={heroBar} />
        <Section style={content}>
          <Heading style={h1}>Compra entregue com sucesso! 🎉</Heading>
          <Text style={text}>
            Seu produto da <strong style={goldText}>VBUCKS BARATO</strong> foi entregue. Confira os detalhes abaixo:
          </Text>

          <Section style={detailsBox}>
            {orderId && (
              <>
                <Text style={detailLabel}>PEDIDO</Text>
                <Text style={detailValue}>#{orderId.substring(0, 8).toUpperCase()}</Text>
              </>
            )}
            {productName && (
              <>
                <Text style={detailLabel}>PRODUTO</Text>
                <Text style={detailValue}>{productName}</Text>
              </>
            )}
            {totalPrice && (
              <>
                <Text style={detailLabel}>VALOR</Text>
                <Text style={detailValue}>R$ {totalPrice}</Text>
              </>
            )}
          </Section>

          {credential && (
            <Section style={credentialBox}>
              <Text style={credentialLabel}>📋 CREDENCIAIS DA CONTA</Text>
              <Text style={credentialText}>{credential}</Text>
            </Section>
          )}

          <Text style={warningText}>
            ⚠️ Guarde essas credenciais em local seguro. Não compartilhe com ninguém.
          </Text>

          <Section style={buttonWrapper}>
            <Button style={button} <Button style={button} href="https://www.vbucksbarato.com/area-cliente">>
              🎮 ACESSAR MINHA ÁREA DO CLIENTE
            </Button>
          </Section>

          <Hr style={divider} />
          <Text style={small}>
            Dúvidas? Abra um ticket na sua área do cliente ou entre em contato via WhatsApp.
            Garantia vitalícia: pedido entregue ou seu dinheiro de volta!
          </Text>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} VBUCKS BARATO — Todos os direitos reservados</Text>
          <Text style={footerSub}>Feito por Ajazz & Bypass</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DeliveryConfirmationEmail,
  subject: 'Sua compra foi entregue! 🎮 — VBUCKS BARATO',
  displayName: 'Confirmação de entrega',
  previewData: {
    productName: 'Conta Valorant — Diamante',
    credential: 'Login: usuario@email.com\nSenha: Abc123!@#\nSenha Antiga: OldPass456',
    orderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    totalPrice: '49,90',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#f5f0e8', fontFamily: "'Urbanist', 'Segoe UI', Arial, sans-serif" }
const wrapper = { maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const, boxShadow: '0 8px 40px rgba(78, 40, 2, 0.08)' }
const header = { backgroundColor: '#1a1108', padding: '28px 0', textAlign: 'center' as const }
const logo = { margin: '0 auto' }
const heroBar = { height: '4px', background: 'linear-gradient(90deg, #D4A843, #ecb32c, #D4A843)' }
const content = { padding: '36px 32px 28px' }
const h1 = { fontSize: '22px', fontWeight: '800' as const, color: '#1a1108', margin: '0 0 16px', lineHeight: '1.3' }
const goldText = { color: '#D4A843' }
const text = { fontSize: '14px', color: '#5c5147', lineHeight: '1.7', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#faf7f2', border: '1px solid #ede8df', borderRadius: '12px', padding: '20px 24px', margin: '0 0 20px' }
const detailLabel = { fontSize: '10px', color: '#a09888', margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.12em', fontWeight: '700' as const }
const detailValue = { fontSize: '15px', color: '#1a1108', fontWeight: '700' as const, margin: '2px 0 14px' }
const credentialBox = { backgroundColor: '#1a1108', borderRadius: '12px', padding: '20px 24px', margin: '0 0 20px' }
const credentialLabel = { fontSize: '11px', color: '#D4A843', margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: '800' as const }
const credentialText = { fontFamily: "'Courier New', Courier, monospace", fontSize: '13px', color: '#e8dcc8', lineHeight: '1.8', margin: '0', whiteSpace: 'pre-wrap' as const }
const warningText = { fontSize: '12px', color: '#c0392b', backgroundColor: '#fdf2f2', border: '1px solid #f5c6cb', borderRadius: '8px', padding: '10px 14px', margin: '0 0 16px' }
const buttonWrapper = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#D4A843', color: '#1a1108', fontSize: '13px', fontWeight: '800' as const, borderRadius: '10px', padding: '14px 36px', textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase' as const }
const divider = { borderColor: '#ede8df', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: '#a09888', lineHeight: '1.5', margin: '0' }
const footer = { backgroundColor: '#1a1108', padding: '20px 32px', textAlign: 'center' as const }
const footerText = { fontSize: '11px', color: '#8a7a60', margin: '0 0 4px' }
const footerSub = { fontSize: '10px', color: '#5c4a30', margin: '0' }
