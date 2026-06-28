import { toWebRequest } from 'h3'
import { auth } from '~~/auth'

export default defineEventHandler(event => auth.handler(toWebRequest(event)))
