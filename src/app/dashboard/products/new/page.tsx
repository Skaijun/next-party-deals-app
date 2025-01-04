import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageWithBackButton from "../../_components/PageWithBackButton";
import ProductDetailsForm from "../../_components/forms/ProductDetailsForm";

const NewProductPage = () => {
  return (
    <PageWithBackButton
      backButtonHref="/dashboard/products"
      pageTitle="Create Product">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Product Details</CardTitle>
        </CardHeader>
        <CardContent>
            <ProductDetailsForm />
        </CardContent>
      </Card>
    </PageWithBackButton>
  );
};

export default NewProductPage;
