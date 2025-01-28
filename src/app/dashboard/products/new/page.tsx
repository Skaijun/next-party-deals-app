import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageWithBackButton from "../../_components/PageWithBackButton";
import ProductDetailsForm from "../../_components/forms/ProductDetailsForm";
import HasPermission from "@/components/HasPermission";
import { canCreateProduct } from "@/server/permissions";

const NewProductPage = () => {
  return (
    <PageWithBackButton
      backButtonHref="/dashboard/products"
      pageTitle="Create Product">

      <HasPermission
        permission={canCreateProduct}
        renderFallback
        fallbackText="You have already created the max number of products. Try to upgrade your acc to create more."
      >

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductDetailsForm />
          </CardContent>
        </Card>
      </HasPermission>
    </PageWithBackButton>
  );
};

export default NewProductPage;
