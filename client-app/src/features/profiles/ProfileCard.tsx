import { observer } from 'mobx-react-lite'
import { Profile } from '../../app/models/profile'
import { Card, Icon, Image } from 'semantic-ui-react'
import { Link } from 'react-router-dom'
import FollowButton from './FollowButton'

interface Props {
    profile: Profile
}

export default observer(function ProfileCard({profile}: Props) {
    const overflowStyle = {
		whiteSpace: "pre-wrap",
		width: "100%",
		overflow: "hidden",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 3,
		display: "-webkit-box",
	};

    return (
		<Card as={Link} to={`/profiles/${profile.userName}`}>
			<Image src={profile.image || "/assets/user.png"} />
			<Card.Content>
				<Card.Header>{profile.displayName}</Card.Header>
				<Card.Description style={overflowStyle}>{profile.bio}</Card.Description>
			</Card.Content>
			<Card.Content extra>
				<Icon name="user" />
				{profile.followersCount} follower{profile.followersCount !== 1 ? "s" : ""}
			</Card.Content>
			<FollowButton profile={profile} />
		</Card>
	);
})
