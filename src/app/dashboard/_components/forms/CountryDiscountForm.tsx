"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { productCountryDiscountSchema } from "@/schemas/products";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateCountryDiscounts } from "@/server/actions/products";

const CountryDiscountForm = ({
  productId,
  countryGroups,
}: {
  productId: string;
  countryGroups: {
    id: string;
    name: string;
    recommendedDiscountPercentage: number | null;
    countries: {
      name: string;
      code: string;
    }[];
    discount?: {
      coupon: string;
      discountPercentage: number;
    };
  }[];
}) => {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof productCountryDiscountSchema>>({
    resolver: zodResolver(productCountryDiscountSchema),
    defaultValues: {
      groups: countryGroups.map((group) => {
        const groupDiscount =
          group.discount?.discountPercentage ??
          group.recommendedDiscountPercentage;
        return {
          countryGroupId: group.id,
          coupon: group.discount?.coupon ?? "",
          discountPercentage:
            groupDiscount != null ? groupDiscount * 100 : undefined,
        };
      }),
    },
  });

  const onSubmit = async (values: z.infer<typeof productCountryDiscountSchema>) => {
    const data = await updateCountryDiscounts(productId, values);

    if (data.message) {
      toast({
        title: data.error ? "Error" : "Success",
        description: data.message,
        variant: data.error ? "destructive" : "default",
      })
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex gap-6 flex-col">
        {countryGroups.map((group, index) => (
          <Card key={group.id}>
            <CardContent className="pt-6 flex gap-16 items-center">
              <div>
                <h2 className="text-muted-foreground text-sm font-semibold mb-2">
                  {group.name}
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {group.countries.map((country) => (
                    <Image
                      key={country.code}
                      width={24}
                      height={24}
                      alt={country.name}
                      title={country.name}
                      src={`http://purecatamphetamine.github.io/country-flag-icons/3x2/${country.code.toLocaleUpperCase()}.svg`}
                      className="border"
                    />
                  ))}
                </div>
              </div>
              <Input
                type="hidden"
                {...form.register(`groups.${index}.countryGroupId`)}
              />

              <div className="ml-auto">
                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name={`groups.${index}.discountPercentage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount %</FormLabel>
                        <FormControl>
                          <Input
                            className="w-24"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              e.target.value ? field.onChange(e.target.valueAsNumber) : field.onChange(undefined)
                            }
                            min="0"
                            max="100"
                            type="number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`groups.${index}.coupon`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coupon</FormLabel>
                        <FormControl>
                          <Input className="w-48" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormMessage>
                  {form.formState.errors.groups?.[index]?.root?.message}
                </FormMessage>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="self-end">
          <Button disabled={form.formState.isSubmitting} type="submit">Save</Button>
        </div>
      </form>
    </Form>
  );
};

export default CountryDiscountForm;
