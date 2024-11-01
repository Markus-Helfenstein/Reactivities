import { observer } from 'mobx-react-lite'
import { Link } from 'react-router-dom'
import { Button, Container, Header, Segment, Image, Divider, Sidebar, Icon } from 'semantic-ui-react'
import { useStore } from '../../../app/stores/store'
import LoginForm from '../../users/LoginForm'
import RegisterForm from '../../users/RegisterForm'
import { GoogleLogin } from '@react-oauth/google'
import { runInAction } from 'mobx'

export default observer(function HomePage() {
    const {userStore, modalStore} = useStore();

	const signInAsDemoUser = async (email: string) => {
		try {
			runInAction(() => userStore.isSignInLoading = true);
			return userStore.login({ email, password: "Pa$$w0rd" });
		} finally {
			runInAction(() => userStore.isSignInLoading = false);
		}		
	};

    return (
		<>
			{!userStore.isLoggedIn && (
				<Sidebar className="left visible">
					<Segment raised style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
						<div>
							<Header as="h1">Demo Users</Header>
							<Divider />
							<Header as="h2">Standard Login</Header>
							<p>Sign in as</p>
							<Button onClick={() => signInAsDemoUser("bob@test.com")}>Bob</Button>
							<Button onClick={() => signInAsDemoUser("jane@test.com")}>Jane</Button>
							<Button onClick={() => signInAsDemoUser("tom@test.com")}>Tom</Button>
							<Divider />
							<Header as="h2">Sign in with Google</Header>
							<p>Please don't change any account settings</p>
							<Header as="h3">Email Address</Header>
							<p>
								demotoni7@gmail.com&nbsp;&nbsp;&nbsp;
								<Button onClick={() => navigator.clipboard.writeText("demotoni7@gmail.com")} data-tooltip="Copy to Clipboard" className="mini icon">
									<Icon name="clipboard" />
								</Button>
							</p>
							<Header as="h3">Password</Header>
							<p>
								.Pa$$w0rd&nbsp;&nbsp;&nbsp;
								<Button onClick={() => navigator.clipboard.writeText(".Pa$$w0rd")} data-tooltip="Copy to Clipboard" className="mini icon">
									<Icon name="clipboard" />
								</Button>
							</p>
							<Divider />
							<p>
								Side note: For demonstration purpose, buttons to delete an activity haven't been removed, even though they shouldn't be there in a productive
								environment. Same goes for the "Errors" menu item.
							</p>
						</div>
					</Segment>
				</Sidebar>
			)}
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
