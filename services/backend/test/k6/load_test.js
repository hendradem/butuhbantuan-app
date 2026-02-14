import http from 'k6/http'
import { sleep } from 'k6'

export let options = {
  vus: 10,
  duration: '30s',
}

export default function () {
  http.get('http://localhost:8080/api/users')
  sleep(1)
}
