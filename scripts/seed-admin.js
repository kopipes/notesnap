// Seed script: creates the initial admin user
// Usage: node scripts/seed-admin.js
// Run once after first migration.

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    console.log(`✓ User "${username}" already exists — skipping`)
    return
  }

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { username, password: hash, role: 'admin' },
  })
  console.log(`✓ Admin user created: "${user.username}" (id: ${user.id})`)
  console.log(`  Password: ${password}`)
  console.log(`  Change this immediately after first login!`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
