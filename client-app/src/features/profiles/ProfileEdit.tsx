import { observer } from "mobx-react-lite";
import { Profile } from "../../app/models/profile";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import CustomTextInput from "../../app/common/form/CustomTextInput";
import CustomTextArea from "../../app/common/form/CustomTextArea";
import { Button } from "semantic-ui-react";

interface Props {
    currentProfile: Profile;
	editProfile: (updatedProfile: Partial<Profile>) => void;
}

export default observer(function ProfileEdit({currentProfile, editProfile}: Props) {
    const initialValues: Partial<Profile> = {
		displayName: currentProfile.displayName,
		bio: currentProfile.bio,
	};

    const validationSchema = Yup.object({
		displayName: Yup.string().required("The display name is required"),
		bio: Yup.string()
    });

    return (
		<Formik validationSchema={validationSchema} enableReinitialize initialValues={initialValues} onSubmit={editProfile}>
			{({ handleSubmit, isValid, isSubmitting, dirty }) => (
				<Form className="ui form" onSubmit={handleSubmit}>
					<CustomTextInput placeholder="Display Name" name="displayName" />
					<CustomTextArea placeholder="Bio" name="bio" rows={10} />
					<Button disabled={isSubmitting || !dirty || !isValid} loading={isSubmitting} floated="right" positive type="submit" content="Submit" />
				</Form>
			)}
		</Formik>
	);
});