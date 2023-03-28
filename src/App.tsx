import React, { useEffect, useState } from 'react'

import axios from 'axios'

import { IAppData, PermissionDesc, PlatformAgentUri, PlatformError } from '@zippie/did-core'
import { PlatformProvider, RecoveryForm, SignInForm, SignUpForm, usePlatform } from '@zippie/did-react-components'

//
// Permissions that this application needs the user to grant.
//
const REQUESTED_PERMISSIONS = [PermissionDesc.READ_FULL_NAME, PermissionDesc.READ_EMAIL]

//
// Component which handles sign-up, sign-in, recovery, etc.
//
const AuthPage: React.FC = () => {
  const [showSignUp, setShowSignUp] = useState<boolean>(false)
  const [showRecovery, setShowRecovery] = useState<boolean>(false)

  const onSignInComplete = async (result: IAppData | PlatformError) => {
    console.info('sign-in-result:', result)
  }

  const onSignUpComplete = (result: IAppData | PlatformError) => {
    console.info('sign-up-result:', result)
  }

  const onRecoveryComplete = (result: IAppData | PlatformError) => {
    console.info('recovery-result:', result)
  }

  const onForgotPasswordClick = () => setShowRecovery(true)
  const onSignInButtonClick = () => setShowSignUp(false)
  const onSignUpClick = () => setShowSignUp(true)

  if (showRecovery) return <RecoveryForm {...{ onRecoveryComplete }} />
  if (showSignUp)
    return <SignUpForm termsLink="" {...{ onSignInButtonClick, onSignUpComplete, onForgotPasswordClick }} />
  return <SignInForm {...{ onSignInComplete, onForgotPasswordClick, onSignUpClick }} />
}

//
//   The default export of this file wraps this component in a PlatformProvider, which allows
// us to use the "usePlatform()" hook to start interacting with a users identity through the
// platform APIs.
//
const AppComponent: React.FC<{ redirectTo: string }> = ({ redirectTo }) => {
  const { appinfo, isReady, isAppSignedIn, userinfo, platform } = usePlatform()
  const [token, setToken] = useState('')

  useEffect(() => {
    if (!isAppSignedIn || !appinfo || !userinfo) return
    ;(async () => {
      const token = (await platform?.getJsonWebToken()) as string
      setToken(token || '')

      // Call backend with JWT, backend verifies and stores JWT and responds with a sessionId,
      // the sessionId is used to grab the JWT from the database.
      const response = await axios.post('/verify', token)
      const { sessionId } = response.data

      // Make this request on backend to verify JWT token. Success will return 200 and jwt body.
      // Validation failure will return 400
      const verified = await axios.post('https://auditable-cryptor.dev.zippie.com', { jwt: token })
      console.info(verified)

      // Redirect to PHP app with sessionId, PHP app can then get user info stored under sessionId,
      // check JWT for expiration, etc.
      document.location = `${redirectTo}?sessionId=${sessionId}`
    })()
  }, [appinfo, isAppSignedIn])

  if (!isReady) return <h4>Loading...</h4>
  if (!isAppSignedIn) return <AuthPage />

  return <div style={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>{token ? token : 'Loading'}</div>
}

//
//   Every decentralized application needs an entry point, the PlatformProvider initializes
// and manages an instance of the BrowserPlatformApi, as well as binding it into a nice
// ReactJS interface with dynamic props and everything.
//
export default () => (
  <PlatformProvider
    clientId="ExampleApp"
    agentUri={PlatformAgentUri.sandbox}
    permissions={REQUESTED_PERMISSIONS}
    config={{}}
  >
    <AppComponent redirectTo={'http://localhost:3000'} />
  </PlatformProvider>
)
