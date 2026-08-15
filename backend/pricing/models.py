from django.db import models
from core.models import TimeStampedModel
from materials.models import Material


class MaterialPrice(TimeStampedModel):
    """
    Price history for a Material. Only one row per material should have
    active=True + effective_to=null at a time (current price). Historical
    rows are kept forever — transactions snapshot price at time of trade
    (see collection_requests.WeighingRecord / stations.StationTransaction),
    so changing this NEVER rewrites past transaction values.
    """

    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name="prices")
    price_per_unit = models.DecimalField(max_digits=12, decimal_places=0, help_text="Toman")
    min_price = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    max_price = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    active = models.BooleanField(default=True)
    effective_from = models.DateTimeField(auto_now_add=True)
    effective_to = models.DateTimeField(null=True, blank=True)
    set_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-effective_from"]

    def __str__(self):
        return f"{self.material} = {self.price_per_unit} تومان"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new and self.active:
            # close out any previously-active price row for this material
            MaterialPrice.objects.filter(
                material=self.material, active=True
            ).exclude(pk=self.pk).update(active=False, effective_to=self.effective_from)
