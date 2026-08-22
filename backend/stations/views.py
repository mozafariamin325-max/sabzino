from rest_framework import viewsets, views, permissions, generics
from rest_framework.response import Response
from materials.models import Material
from collection_requests.services import haversine_km
from .models import RecyclingStation
from .serializers import RecyclingStationSerializer, StationTransactionSerializer, CreateStationTransactionSerializer
from .services import find_citizen, create_station_transaction


class RecyclingStationViewSet(viewsets.ModelViewSet):
    queryset = RecyclingStation.objects.filter(is_active=True).prefetch_related("accepted_materials")
    serializer_class = RecyclingStationSerializer

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method in permissions.SAFE_METHODS else [permissions.IsAdminUser()]

    def list(self, request, *args, **kwargs):
        lat, lng = request.query_params.get("lat"), request.query_params.get("lng")
        qs = self.filter_queryset(self.get_queryset())
        stations = list(qs)
        if lat and lng:
            for s in stations:
                s.distance_km = round(haversine_km(lat, lng, s.lat, s.lng), 2)
            stations.sort(key=lambda s: s.distance_km)
        serializer = self.get_serializer(stations, many=True)
        return Response({"success": True, "stations": serializer.data})


class StationOperatorTransactionView(views.APIView):
    """Operator flow (spec section 16): scan/lookup citizen -> weigh -> settle instantly."""

    def post(self, request):
        operator_profile = getattr(request.user, "station_operator_profile", None)
        if not operator_profile:
            return Response({"success": False, "message": "شما اپراتور ایستگاه نیستید."}, status=403)
        serializer = CreateStationTransactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            citizen = find_citizen(data["citizen_identifier"])
            material = Material.objects.get(pk=data["material"], is_active=True)
        except (ValueError, Material.DoesNotExist) as e:
            return Response({"success": False, "message": str(e) or "ماده یافت نشد."}, status=400)

        txn = create_station_transaction(operator_profile.station, operator_profile, citizen, material, data["weight_kg"])
        return Response({"success": True, "message": "تراکنش با موفقیت ثبت شد.", "transaction": StationTransactionSerializer(txn).data}, status=201)


class MyStationTransactionsView(generics.ListAPIView):
    serializer_class = StationTransactionSerializer

    def get_queryset(self):
        operator_profile = getattr(self.request.user, "station_operator_profile", None)
        if operator_profile:
            return operator_profile.station.transactions.all()
        return self.request.user.station_transactions.all()
