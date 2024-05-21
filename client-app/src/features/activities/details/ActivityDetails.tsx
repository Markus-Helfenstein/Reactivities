import { Card, CardContent, CardHeader, CardMeta, CardDescription, Image, Button } from 'semantic-ui-react';
import { useStore } from '../../../app/stores/store';
import LoadingComponent from '../../../app/layout/LoadingComponent';
import { observer } from 'mobx-react-lite';
import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';

export default observer(function ActivityDetails() {
  const { activityStore } = useStore();
  const { selectedActivity, loadActivity, loadingInitial } = activityStore;
  const {id} = useParams();

  useEffect(() => {
    if (id) {
      loadActivity(id);
    } 
  }, [id, loadActivity])

  if (loadingInitial || !selectedActivity) return <LoadingComponent />;

  return (
    <Card fluid>
      <Image src={`/assets/categoryImages/${selectedActivity.category}.jpg`} />
      <CardContent>
        <CardHeader>{selectedActivity.title}</CardHeader>
        <CardMeta>
          <span>{selectedActivity.date}</span>
        </CardMeta>
        <CardDescription>{selectedActivity.description}</CardDescription>
      </CardContent>
      <CardContent extra>
        <Button.Group widths="2">
          <Button as={Link} to={`/manage/${selectedActivity.id}`} basic color="blue" content="Edit" />
          <Button as={Link} to="/activities" basic color="grey" content="Cancel" />
        </Button.Group>
      </CardContent>
    </Card>
  );
});
