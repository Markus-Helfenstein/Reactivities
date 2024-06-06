import { useEffect, useState } from 'react'
import { Button, Header, Segment } from 'semantic-ui-react'
import { useStore } from '../../../app/stores/store';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActivityFormValues } from '../../../app/models/activity';
import LoadingComponent from '../../../app/layout/LoadingComponent';
import { v4 as uuid } from "uuid";
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import CustomTextInput from '../../../app/common/form/CustomTextInput';
import CustomTextArea from '../../../app/common/form/CustomTextArea';
import { categoryOptions } from '../../../app/common/options/categoryOptions';
import CustomSelectInput from '../../../app/common/form/CustomSelectInput';
import CustomDateInput from '../../../app/common/form/CustomDateInput';

export default observer(function ActivityForm() {
  const { activityStore } = useStore();
  const { createActivity, updateActivity, loadActivity, loadingInitial } = activityStore;
  const {id} = useParams();
  const navigate = useNavigate();

  const [activity, setActivity] = useState(new ActivityFormValues());

  const validationSchema = Yup.object({
    title: Yup.string().required("The activity title is required"),
    description: Yup.string().required("The activity description is required"),
    category: Yup.string().required(),
    date: Yup.string().required().nullable(),
    venue: Yup.string().required(),
    city: Yup.string().required(),
  });

  useEffect(() => {
    if (id) {
      // new ActivityFormValues omits properties like Attendees that aren't used in the form
      loadActivity(id).then((activity) => setActivity(new ActivityFormValues(activity)));
    }
  }, [id, loadActivity])

  async function handleFormikSubmit(activity: ActivityFormValues) {
    if (!activity.id) {
      activity.id = uuid();
      await createActivity(activity);
    } else {
      await updateActivity(activity);
    }
    navigate(`/activities/${activity.id}`);
  }

  if (loadingInitial) return <LoadingComponent content='Loading activity...' />

  return (
    <Segment clearing>
      <Header content="Activity Details" sub color="teal" />
      <Formik validationSchema={validationSchema} enableReinitialize initialValues={activity} onSubmit={handleFormikSubmit}>
        {({ handleSubmit, isValid, isSubmitting, dirty }) => (
          <Form className="ui form" onSubmit={handleSubmit} autoComplete="off">
            <CustomTextInput placeholder="Title" name="title" />
            <CustomTextArea placeholder="Description" name="description" rows={3} />
            <CustomSelectInput placeholder="Category" name="category" options={categoryOptions} />
            <CustomDateInput placeholderText="Date" name="date" showTimeSelect timeCaption="Time" dateFormat="MMMM d, yyyy h:mm aa" />
            <Header content="Location Details" sub color="teal" />
            <CustomTextInput placeholder="City" name="city" />
            <CustomTextInput placeholder="Venue" name="venue" />
            <Button disabled={isSubmitting || !dirty || !isValid} loading={isSubmitting} floated="right" positive type="submit" content="Submit" />
            <Button as={Link} to="/activities" floated="right" type="button" content="Cancel" />
          </Form>
        )}
      </Formik>
    </Segment>
  );
});
