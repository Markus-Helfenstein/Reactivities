import { observer } from "mobx-react-lite";
import { Card, Image } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { IActivity } from "../../app/models/activity";
import { format } from "date-fns";

interface Props {
	activity: Partial<IActivity>;
}

export default observer(function ProfileActivitiesCard({ activity }: Props) {
	return (
		<Card as={Link} to={`/activities/${activity.id}`}>
			<Image src={`/assets/categoryImages/${activity.category}.jpg`} style={{ minHeight: 100, objectFit: "cover" }} />
			<Card.Content textAlign="center">
				<Card.Header>{activity.title}</Card.Header>
				{activity.date instanceof Date && (
					<>
						<Card.Description>{format(activity.date as Date, "do MMM y")}</Card.Description>
						<Card.Description>{format(activity.date as Date, "h:mm aa")}</Card.Description>
					</>
				)}
			</Card.Content>
		</Card>
	);
});
