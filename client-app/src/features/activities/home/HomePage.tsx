import { observer } from 'mobx-react-lite'
import { Link } from 'react-router-dom'
import { Button, Container, Header, Segment, Image, Divider } from 'semantic-ui-react'
import { useStore } from '../../../app/stores/store'
import LoginForm from '../../users/LoginForm'
import RegisterForm from '../../users/RegisterForm'
import { GoogleLogin } from '@react-oauth/google'

export default observer(function HomePage() {
    const {userStore, modalStore} = useStore();

    // className="ui button google huge inverted"
    return (
		<Segment inverted textAlign="center" vertical className="masthead">
			<Container text>
				<Header as="h1" inverted>
					<Image size="massive" src="/assets/logo.png" alt="logo" style={{ marginBottom: 12 }} />
					Reactivities
				</Header>
				{userStore.isLoggedIn ? (
					<>
						<Header as="h2" inverted content="Welcome to Reactivities" />
						<Button as={Link} to="/activities" size="huge" inverted>
							Go to Activities!
						</Button>
					</>
				) : (
					<>
						<Button onClick={() => modalStore.openModal(<LoginForm />)} to="/login" size="huge" inverted>
							Login!
						</Button>
						<Button onClick={() => modalStore.openModal(<RegisterForm />)} to="/login" size="huge" inverted>
							Register
						</Button>
						<Divider horizontal inverted>
							Or
						</Divider>
						<Container style={{ width: "258px" }} className={`ui google huge inverted${userStore.isGoogleSignInLoading ? " loading" : ""}`}>
							<GoogleLogin width="254" onSuccess={(response) => userStore.signInWithGoogle(response.credential!)} onError={() => console.log("Google One-tap sign in failed")} />
						</Container>
					</>
				)}
			</Container>
		</Segment>
	);
})
