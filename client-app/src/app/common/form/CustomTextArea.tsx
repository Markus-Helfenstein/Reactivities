import { useField } from "formik";
import { Form, Label } from "semantic-ui-react";

// names must match official input attributes
interface Props {
  placeholder: string;
  name: string;
  rows: number;
  label?: string;
}

export default function CustomTextArea(props: Props) {
  const [field, meta] = useField(props.name);

  // "!!" casts into boolean, otherwise "&&" would yield the error string itself
  // "..." populates the input attributes
  return (
    <Form.Field error={meta.touched && !!meta.error}>
      <label>{props.label}</label>
      <textarea {...field} {...props} />
      {meta.touched && meta.error ? (
        <Label basic color="red">
          {meta.error}
        </Label>
      ) : null}
    </Form.Field>
  );
}
