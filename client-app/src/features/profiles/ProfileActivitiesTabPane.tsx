import { observer } from "mobx-react-lite";
import { Card, TabPane } from "semantic-ui-react";
import ProfileActivitiesCard from "./ProfileActivitiesCard";
import { useStore } from "../../app/stores/store";

interface Props {}

export default observer(function ProfileActivities({}: Props) {
    const { profileStore } = useStore();
    const { loadingActivities, userActivities } = profileStore;
 
	return (
		<TabPane loading={loadingActivities}>
            <br />
			<Card.Group itemsPerRow={4}>
				{userActivities.map((a) => (
					<ProfileActivitiesCard key={a.id} activity={a} />
				))}
			</Card.Group>
		</TabPane>
	);
});