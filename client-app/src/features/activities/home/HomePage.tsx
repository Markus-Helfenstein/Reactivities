import { observer } from 'mobx-react-lite'
import { Link } from 'react-router-dom'
import { Button, Container, Header, Segment, Image, Divider, Sidebar } from 'semantic-ui-react'
import { useStore } from '../../../app/stores/store'
import LoginForm from '../../users/LoginForm'
import RegisterForm from '../../users/RegisterForm'
import { GoogleLogin } from '@react-oauth/google'

export default observer(function HomePage() {
    const {userStore, modalStore} = useStore();

    // className="ui button google huge inverted"
    return (
		<>
			<Sidebar className="left visible">
				<Segment raised style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
					<div>
						<Header as="h1">Demo Users</Header>
						<Divider />
						<Header as="h2">Standard Login</Header>
						<Header as="h3">Email Addresses</Header>
						<p>bob@test.com</p>
						<p>jane@test.com</p>
						<p>tom@test.com</p>
						<Header as="h3">Password for all 3</Header>
						<p>Pa$$w0rd</p>
						<Divider />
						<Header as="h2">Sign in with Google</Header>
						<p>Please don't change any account settings</p>
						<Header as="h3">Email Address</Header>
						<p>demotoni7@gmail.com</p>
						<Header as="h3">Password</Header>
						<p>.Pa$$w0rd</p>
					</div>
				</Segment>
			</Sidebar>
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
							<Container style={{ width: "258px" }}>
								<GoogleLogin
									width="254"
									useOneTap
									onSuccess={(response) => userStore.signInWithGoogle(response.credential!)}
									onError={() => console.log("Google One-tap sign in failed")}
								/>
							</Container>
						</>
					)}
				</Container>
			</Segment>
		</>
	);
})
