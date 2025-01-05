"use client";

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteProduct } from "@/server/actions/products";
import { useTransition } from "react";

const DeleteProductAlertDialogContent = ({ id }: { id: string }) => {
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  function handleDeleteAction() {
    startDeleteTransition(async () => {
      const data = await deleteProduct(id);

      if (data.message) {
        toast({
          title: data.error ? "Error" : "Success",
          description: data.message,
          variant: data.error ? "destructive" : "default",
        });
      }
    });
  }

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undode!
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDeleteAction}
          disabled={isDeletePending}>
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
};

export default DeleteProductAlertDialogContent;
