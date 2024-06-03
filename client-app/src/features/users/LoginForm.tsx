import { ErrorMessage, Form, Formik } from "formik";
import CustomTextInput from "../../app/common/form/CustomTextInput";
import { Button, Header, Label } from "semantic-ui-react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";

export default observer(function LoginForm() {
    const {userStore} = useStore();
    
    return (
      <Formik initialValues={{ email: "", password: "", errorLabelText: null }} onSubmit={(values, { setErrors }) => userStore.login(values).catch((_error) => setErrors({ errorLabelText: "Login failed!" }))}>
        {({ handleSubmit, isSubmitting, errors }) => (
          <Form className="ui form" onSubmit={handleSubmit} autoComplete="off">
            <Header as='h2' content='Login to Reactivities' color="teal" textAlign="center" />
            <CustomTextInput placeholder="Email" name="email" />
            <CustomTextInput placeholder="Password" name="password" type="password" />
            <ErrorMessage name="errorLabelText" render={() => <Label style={{ marginBottom: 10 }} basic color="red" content={errors.errorLabelText} />} />
            <Button loading={isSubmitting} positive content="Login" type="submit" fluid />
          </Form>
        )}
      </Formik>
    );
})