import { observer } from "mobx-react-lite";
import { Segment, Header, Comment, Loader } from "semantic-ui-react";
import { useStore } from "../../../app/stores/store";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Formik, Form, Field, FieldProps } from "formik";
import * as Yup from "yup";

interface Props {
  activityId: string;
}

export default observer(function ActivityDetailedChat({activityId}: Props) {
  const {commentStore} = useStore();

  useEffect(() => {
    if (activityId) {
      commentStore.createHubConnection(activityId);
    }
    // upon disposal of the component also close the connection
    return () => {
      commentStore.clearComments();
    }
  }, [commentStore, activityId]);

  const formatTimeStamp = (timeStamp: Date) => {
    const localDateWithoutTime: number = new Date().setHours(0, 0, 0, 0);
    // new Date(timeStamp) creates copy in local timezone
    const localTimeStampDateWithoutTime: number = new Date(timeStamp).setHours(0, 0, 0, 0);
    // on same day, show how long ago
    if (localDateWithoutTime === localTimeStampDateWithoutTime) {
      return formatDistanceToNow(timeStamp, {addSuffix: true});
    }
    return format(timeStamp, "dd MMM yyyy h:mm aa");
  }

  return (
		<>
			<Segment textAlign="center" attached="top" inverted color="teal" style={{ border: "none" }}>
				<Header>Chat about this event</Header>
			</Segment>
			<Segment attached clearing>
				<Formik initialValues={{ body: "", activityId }} onSubmit={(values, { resetForm }) => commentStore.addComment(values)?.then(resetForm)} validationSchema={Yup.object({ body: Yup.string().required() })}>
					{({ isSubmitting, isValid, handleSubmit }) => (
						<Form className="ui form">
							<Field name="body">
								{(props: FieldProps) => (
									<div style={{ position: "relative" }}>
										<Loader active={isSubmitting} />
										<textarea
											placeholder="Enter your comment (Enter to submit, SHIFT + enter for new line)"
											rows={2}
											{...props.field}
											onKeyDown={(e) => {
												if (e.key === "Enter" && e.shiftKey) {
													return;
												}
												if (e.key === "Enter" && !e.shiftKey) {
													e.preventDefault();
													isValid && handleSubmit();
												}
											}}
										/>
									</div>
								)}
							</Field>
						</Form>
					)}
				</Formik>
				<Comment.Group>
					{commentStore.comments.map((comment) => (
						<Comment key={comment.id}>
							<Comment.Avatar src={comment.image || "/assets/user.png"} />
							<Comment.Content>
								<Comment.Author as={Link} to={`/profiles/${comment.userName}`}>
									{comment.displayName}
								</Comment.Author>
								<Comment.Metadata>
									<div>{formatTimeStamp(comment.createdAt)}</div>
								</Comment.Metadata>
								<Comment.Text style={{ whiteSpace: "pre-wrap" }}>{comment.body}</Comment.Text>
							</Comment.Content>
						</Comment>
					))}
				</Comment.Group>
			</Segment>
		</>
  );
});
