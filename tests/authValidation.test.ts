import assert from 'node:assert/strict'
import test from 'node:test'
import { signUpSchema } from '../shared/validation/auth'

const validSignup = {
  fullname: 'Policy Author',
  username: 'policy_author',
  email: 'author@example.com',
  country: 'Ghana',
  institution: 'Policy Institute',
  password: 'StrongPass1!',
  confirmPassword: 'StrongPass1!'
}

test('signUpSchema accepts a strong matching password', () => {
  assert.equal(signUpSchema.safeParse(validSignup).success, true)
})

test('signUpSchema rejects passwords without required complexity', () => {
  assert.equal(signUpSchema.safeParse({
    ...validSignup,
    password: 'password',
    confirmPassword: 'password'
  }).success, false)
})
